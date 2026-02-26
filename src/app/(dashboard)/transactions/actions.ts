"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq, sql } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { transactions, transactionItems, balanceSheets } from "@/db/schema";
import {
    addTransactionSchema,
    editTransactionSchema,
} from "@/lib/transactions/schemas";
import { requirePermission } from "@/lib/auth/config";
import { z } from "zod/v4";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Helper: save uploaded file
   ══════════════════════════════════════════════ */

/* ── Allowed file extensions for uploads ── */
const ALLOWED_EXTENSIONS = new Set([
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
]);

async function saveFile(
    file: File,
): Promise<{ path: string; name: string } | null> {
    if (!file || file.size === 0) return null;

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) return null;

    const ext = path.extname(file.name).toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) return null;

    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "transactions",
    );
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return {
        path: `/uploads/transactions/${filename}`,
        name: file.name,
    };
}

/* ══════════════════════════════════════════════
   Tambah Transaksi
   ══════════════════════════════════════════════ */

export async function addTransactionAction(
    formData: FormData,
): Promise<ActionResult> {
    try {
        const rawData = JSON.parse(formData.get("data") as string);
        rawData.date = new Date(rawData.date);

        const parsed = addTransactionSchema.safeParse(rawData);
        if (!parsed.success) {
            return {
                success: false,
                error: "Data tidak valid. Periksa kembali input Anda.",
            };
        }

        const user = await requirePermission("create");
        const { date, itemIds, rkapId, recipientName, amount, type, accountName } =
            parsed.data;

        // Handle file upload
        const file = formData.get("attachment") as File | null;
        const savedFile = file ? await saveFile(file) : null;

        await db.transaction(async (trx) => {
            // Insert transaction
            const [tx] = await trx
                .insert(transactions)
                .values({
                    date,
                    rkapId,
                    recipientName,
                    amount: String(amount),
                    type,
                    accountName,
                    attachmentPath: savedFile?.path ?? null,
                    attachmentName: savedFile?.name ?? null,
                    createdBy: user.userId,
                })
                .returning();

            // Insert transaction items
            if (itemIds.length > 0) {
                await trx.insert(transactionItems).values(
                    itemIds.map((itemId) => ({
                        transactionId: tx.id,
                        itemId,
                    })),
                );
            }

            // Adjust balance_sheet balance
            const isAdd = type === "income";
            await trx
                .update(balanceSheets)
                .set({
                    balance: isAdd
                        ? sql`${balanceSheets.balance} + ${String(amount)}`
                        : sql`${balanceSheets.balance} - ${String(amount)}`,
                })
                .where(eq(balanceSheets.name, accountName));
        });

        revalidatePath("/transactions");
        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[addTransactionAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan. Silakan coba lagi.",
        };
    }
}

/* ══════════════════════════════════════════════
   Hapus Transaksi (Batch)
   ══════════════════════════════════════════════ */

export async function deleteTransactionsAction(
    ids: string[],
): Promise<ActionResult> {
    const parsedIds = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!parsedIds.success) {
        return { success: false, error: "Tidak ada data yang dipilih." };
    }

    try {
        await requirePermission("delete:own");

        await db.transaction(async (trx) => {
            // Fetch all transactions to reverse their balance effects
            const toDelete = await trx
                .select({
                    id: transactions.id,
                    amount: transactions.amount,
                    type: transactions.type,
                    accountName: transactions.accountName,
                    attachmentPath: transactions.attachmentPath,
                })
                .from(transactions)
                .where(inArray(transactions.id, parsedIds.data));

            // Reverse balance for each transaction
            for (const tx of toDelete) {
                const amt = Number(tx.amount);
                if (amt === 0) continue;

                // Reverse: income was +, so now -; expense was -, so now +
                const isAdd = tx.type === "expense"; // reverse
                await trx
                    .update(balanceSheets)
                    .set({
                        balance: isAdd
                            ? sql`${balanceSheets.balance} + ${tx.amount}`
                            : sql`${balanceSheets.balance} - ${tx.amount}`,
                    })
                    .where(eq(balanceSheets.name, tx.accountName));
            }

            // Delete the transactions (cascade deletes transaction_items)
            await trx
                .delete(transactions)
                .where(inArray(transactions.id, parsedIds.data));

            // Delete attachment files from disk
            for (const tx of toDelete) {
                if (tx.attachmentPath) {
                    const filePath = path.join(process.cwd(), "public", tx.attachmentPath);
                    await unlink(filePath).catch(() => { });
                }
            }
        });

        revalidatePath("/transactions");
        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[deleteTransactionsAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat menghapus data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Edit Transaksi
   ══════════════════════════════════════════════ */

export async function editTransactionAction(
    formData: FormData,
): Promise<ActionResult> {
    try {
        const rawData = JSON.parse(formData.get("data") as string);
        rawData.date = new Date(rawData.date);

        const parsed = editTransactionSchema.safeParse(rawData);
        if (!parsed.success) {
            return {
                success: false,
                error: "Data tidak valid. Periksa kembali input Anda.",
            };
        }

        await requirePermission("update:own");

        const {
            id,
            date,
            itemIds,
            rkapId,
            recipientName,
            amount,
            type,
            accountName,
        } = parsed.data;

        // Handle file
        const file = formData.get("attachment") as File | null;
        const savedFile = file ? await saveFile(file) : null;

        // Sanitize existing attachment values from FormData
        const rawExistingPath = formData.get("existingAttachmentPath") as
            | string
            | null;
        const rawExistingName = formData.get("existingAttachmentName") as
            | string
            | null;

        let existingPath: string | null = null;
        let existingName: string | null = null;
        if (rawExistingPath && rawExistingName) {
            // Only allow paths within /uploads/transactions/ — block traversal
            const normalised = path.posix.normalize(rawExistingPath);
            if (
                normalised.startsWith("/uploads/transactions/") &&
                !normalised.includes("..")
            ) {
                existingPath = normalised;
                // Strip any path characters from the name
                existingName = rawExistingName.replace(/[/\\]/g, "");
            }
        }

        await db.transaction(async (trx) => {
            // 1. Fetch old transaction to reverse its balance effect
            const [oldTx] = await trx
                .select({
                    amount: transactions.amount,
                    type: transactions.type,
                    accountName: transactions.accountName,
                })
                .from(transactions)
                .where(eq(transactions.id, id));

            if (oldTx) {
                const oldAmt = Number(oldTx.amount);
                if (oldAmt > 0) {
                    // Reverse old effect: income was +, now -; expense was -, now +
                    const reverseIsAdd = oldTx.type === "expense";
                    await trx
                        .update(balanceSheets)
                        .set({
                            balance: reverseIsAdd
                                ? sql`${balanceSheets.balance} + ${oldTx.amount}`
                                : sql`${balanceSheets.balance} - ${oldTx.amount}`,
                        })
                        .where(eq(balanceSheets.name, oldTx.accountName));
                }
            }

            // 2. Update transaction
            await trx
                .update(transactions)
                .set({
                    date,
                    rkapId,
                    recipientName,
                    amount: String(amount),
                    type,
                    accountName,
                    attachmentPath: savedFile?.path ?? existingPath ?? null,
                    attachmentName: savedFile?.name ?? existingName ?? null,
                })
                .where(eq(transactions.id, id));

            // 3. Apply new balance effect
            if (amount > 0) {
                const newIsAdd = type === "income";
                await trx
                    .update(balanceSheets)
                    .set({
                        balance: newIsAdd
                            ? sql`${balanceSheets.balance} + ${String(amount)}`
                            : sql`${balanceSheets.balance} - ${String(amount)}`,
                    })
                    .where(eq(balanceSheets.name, accountName));
            }

            // 4. Replace transaction items: delete old + insert new
            await trx
                .delete(transactionItems)
                .where(eq(transactionItems.transactionId, id));

            if (itemIds.length > 0) {
                await trx.insert(transactionItems).values(
                    itemIds.map((itemId) => ({
                        transactionId: id,
                        itemId,
                    })),
                );
            }
        });

        revalidatePath("/transactions");
        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[editTransactionAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat mengubah data.",
        };
    }
}
