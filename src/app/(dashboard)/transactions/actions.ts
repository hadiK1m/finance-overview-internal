"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq, sql } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { transactions, transactionItems, balanceSheets, items, rkapNames } from "@/db/schema";
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

/* ══════════════════════════════════════════════
   Import CSV — Bulk insert transactions
   ──────────────────────────────────────────────
   CSV columns (header row required):
   tanggal, rkap, items, penerima, jumlah, tipe, sumber_dana
   
   • tanggal     : DD/MM/YYYY or YYYY-MM-DD
   • rkap        : Nama RKAP (exact match)
   • items       : Nama item — pisahkan multiple dengan ";"
   • penerima    : Nama penerima
   • jumlah      : Angka (tanpa titik/koma ribuan)
   • tipe        : "income" atau "expense"
   • sumber_dana : Nama akun / sumber dana (exact match)
   ══════════════════════════════════════════════ */

export type ImportResult =
    | { success: true; error: null; imported: number; skipped: number; errors: string[] }
    | { success: false; error: string; imported?: undefined; skipped?: undefined; errors?: string[] };

export async function importTransactionsCsvAction(
    formData: FormData,
): Promise<ImportResult> {
    try {
        const user = await requirePermission("create");

        const file = formData.get("csv") as File | null;
        if (!file || file.size === 0) {
            return { success: false, error: "Tidak ada file CSV yang dipilih." };
        }

        // Validate type
        const validTypes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
        if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
            return { success: false, error: "File harus berformat CSV." };
        }

        // Max 2 MB for CSV
        if (file.size > 2 * 1024 * 1024) {
            return { success: false, error: "Ukuran CSV maksimal 2 MB." };
        }

        const text = await file.text();
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        if (lines.length < 2) {
            return { success: false, error: "CSV kosong atau hanya berisi header." };
        }

        // Auto-detect delimiter (semicolon or comma)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";

        // Parse header
        const header = firstLine.toLowerCase().split(delimiter).map((h) => h.trim());
        const requiredCols = ["tanggal", "rkap", "items", "penerima", "jumlah", "tipe", "sumber_dana"];
        const missing = requiredCols.filter((c) => !header.includes(c));
        if (missing.length > 0) {
            return {
                success: false,
                error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan header CSV sesuai template.`,
            };
        }

        const colIdx = Object.fromEntries(header.map((h, i) => [h, i]));

        // Pre-fetch lookup maps (name → id) for RKAP, items, accounts
        const allRkap = await db.select({ id: rkapNames.id, name: rkapNames.name }).from(rkapNames);
        const rkapMap = new Map(allRkap.map((r) => [r.name.toLowerCase(), r.id]));

        const allItems = await db.select({ id: items.id, name: items.name }).from(items);
        const itemMap = new Map(allItems.map((i) => [i.name.toLowerCase(), i.id]));

        const allAccounts = await db.select({ name: balanceSheets.name }).from(balanceSheets);
        const accountSet = new Set(allAccounts.map((a) => a.name.toLowerCase()));

        // Parse data rows
        const rowErrors: string[] = [];
        const validRows: {
            date: Date;
            rkapId: string;
            itemIds: string[];
            recipientName: string;
            amount: number;
            type: "income" | "expense";
            accountName: string;
        }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const rowNum = i + 1;
            const cols = parseCsvLine(lines[i], delimiter);

            if (cols.length < header.length) {
                rowErrors.push(`Baris ${rowNum}: Jumlah kolom tidak sesuai (${cols.length}/${header.length})`);
                continue;
            }

            const rawDate = cols[colIdx.tanggal].trim();
            const rawRkap = cols[colIdx.rkap].trim();
            const rawItems = cols[colIdx.items].trim();
            const rawPenerima = cols[colIdx.penerima].trim();
            const rawJumlah = cols[colIdx.jumlah].trim();
            const rawTipe = cols[colIdx.tipe].trim().toLowerCase();
            const rawSumberDana = cols[colIdx.sumber_dana].trim();

            // Validate date (DD/MM/YYYY or YYYY-MM-DD)
            const parsedDate = parseFlexibleDate(rawDate);
            if (!parsedDate) {
                rowErrors.push(`Baris ${rowNum}: Format tanggal tidak valid "${rawDate}". Gunakan DD/MM/YYYY atau YYYY-MM-DD.`);
                continue;
            }

            // Validate RKAP
            const rkapId = rkapMap.get(rawRkap.toLowerCase());
            if (!rkapId) {
                rowErrors.push(`Baris ${rowNum}: RKAP "${rawRkap}" tidak ditemukan di database.`);
                continue;
            }

            // Validate items
            const itemNames = rawItems.split(";").map((n) => n.trim()).filter(Boolean);
            if (itemNames.length === 0) {
                rowErrors.push(`Baris ${rowNum}: Minimal satu item harus diisi.`);
                continue;
            }
            const itemIds: string[] = [];
            let itemError = false;
            for (const name of itemNames) {
                const itemId = itemMap.get(name.toLowerCase());
                if (!itemId) {
                    rowErrors.push(`Baris ${rowNum}: Item "${name}" tidak ditemukan di database.`);
                    itemError = true;
                    break;
                }
                itemIds.push(itemId);
            }
            if (itemError) continue;

            // Validate penerima
            if (!rawPenerima) {
                rowErrors.push(`Baris ${rowNum}: Nama penerima wajib diisi.`);
                continue;
            }

            // Validate jumlah — strip dots/commas used as thousand separators
            const cleanedAmount = rawJumlah.replace(/\./g, "").replace(",", ".");
            const amount = parseFloat(cleanedAmount);
            if (isNaN(amount) || amount < 0) {
                rowErrors.push(`Baris ${rowNum}: Jumlah "${rawJumlah}" tidak valid.`);
                continue;
            }

            // Validate tipe (support Indonesian aliases)
            const tipeMap: Record<string, "income" | "expense"> = {
                income: "income",
                expense: "expense",
                pemasukan: "income",
                pengeluaran: "expense",
            };
            const mappedTipe = tipeMap[rawTipe];
            if (!mappedTipe) {
                rowErrors.push(`Baris ${rowNum}: Tipe "${rawTipe}" tidak valid. Gunakan "income"/"pemasukan" atau "expense"/"pengeluaran".`);
                continue;
            }

            // Validate sumber dana
            if (!accountSet.has(rawSumberDana.toLowerCase())) {
                rowErrors.push(`Baris ${rowNum}: Sumber Dana "${rawSumberDana}" tidak ditemukan di database.`);
                continue;
            }

            validRows.push({
                date: parsedDate,
                rkapId,
                itemIds,
                recipientName: rawPenerima,
                amount,
                type: mappedTipe,
                accountName: rawSumberDana,
            });
        }

        if (validRows.length === 0) {
            return {
                success: false,
                error: "Tidak ada data valid untuk diimport.",
                errors: rowErrors,
            };
        }

        // Insert in a single DB transaction
        await db.transaction(async (trx) => {
            for (const row of validRows) {
                const [tx] = await trx
                    .insert(transactions)
                    .values({
                        date: row.date,
                        rkapId: row.rkapId,
                        recipientName: row.recipientName,
                        amount: String(row.amount),
                        type: row.type,
                        accountName: row.accountName,
                        createdBy: user.userId,
                    })
                    .returning();

                // Insert transaction items
                if (row.itemIds.length > 0) {
                    await trx.insert(transactionItems).values(
                        row.itemIds.map((itemId) => ({
                            transactionId: tx.id,
                            itemId,
                        })),
                    );
                }

                // Adjust balance sheet
                const isAdd = row.type === "income";
                await trx
                    .update(balanceSheets)
                    .set({
                        balance: isAdd
                            ? sql`${balanceSheets.balance} + ${String(row.amount)}`
                            : sql`${balanceSheets.balance} - ${String(row.amount)}`,
                    })
                    .where(eq(balanceSheets.name, row.accountName));
            }
        });

        revalidatePath("/transactions");
        revalidatePath("/cash-balance");

        return {
            success: true,
            error: null,
            imported: validRows.length,
            skipped: rowErrors.length,
            errors: rowErrors,
        };
    } catch (error) {
        console.error("[importTransactionsCsvAction] Error:", error);
        return { success: false, error: "Terjadi kesalahan saat mengimport data." };
    }
}

/* ── CSV line parser (handles quoted fields, supports comma or semicolon delimiter) ── */
function parseCsvLine(line: string, delimiter: string = ","): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === delimiter) {
                result.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}

/* ── Flexible date parser: DD/MM/YYYY or YYYY-MM-DD ── */
function parseFlexibleDate(raw: string): Date | null {
    // Try DD/MM/YYYY
    const ddmmyyyy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy;
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(date.getTime())) return date;
    }

    // Try YYYY-MM-DD
    const yyyymmdd = raw.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (yyyymmdd) {
        const [, y, m, d] = yyyymmdd;
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(date.getTime())) return date;
    }

    return null;
}
