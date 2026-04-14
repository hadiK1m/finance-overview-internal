"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { balanceSheets } from "@/db/schema";
import {
    addBalanceSheetSchema,
    editBalanceSheetSchema,
    type AddBalanceSheetValues,
    type EditBalanceSheetValues,
} from "@/lib/cash-balance/schemas";
import { requirePermission } from "@/lib/auth/config";
import { z } from "zod/v4";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Tambah Nama Akun
   ══════════════════════════════════════════════ */

export async function addBalanceSheetAction(
    data: AddBalanceSheetValues,
): Promise<ActionResult> {
    const parsed = addBalanceSheetSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    // requirePermission calls redirect() on failure — must be outside try-catch
    // so Next.js can handle the NEXT_REDIRECT throw correctly.
    const user = await requirePermission("create");

    try {
        await db.insert(balanceSheets).values({
            name: parsed.data.name,
            balance: String(parsed.data.balance),
            date: parsed.data.date,
            createdBy: user.userId,
        });

        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[addBalanceSheetAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan. Silakan coba lagi.",
        };
    }
}

/* ══════════════════════════════════════════════
   Hapus Nama Akun (Batch)
   ══════════════════════════════════════════════ */

export async function deleteBalanceSheetsAction(
    ids: string[],
): Promise<ActionResult> {
    const parsed = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!parsed.success) {
        return { success: false, error: "Tidak ada data yang dipilih." };
    }

    try {
        await requirePermission("delete:own");

        await db
            .delete(balanceSheets)
            .where(inArray(balanceSheets.id, parsed.data));

        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[deleteBalanceSheetsAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat menghapus data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Edit Nama Akun
   ══════════════════════════════════════════════ */

export async function editBalanceSheetAction(
    data: EditBalanceSheetValues,
): Promise<ActionResult> {
    const parsed = editBalanceSheetSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    try {
        await requirePermission("update:own");

        await db
            .update(balanceSheets)
            .set({
                name: parsed.data.name,
                balance: String(parsed.data.balance),
                date: parsed.data.date,
            })
            .where(eq(balanceSheets.id, parsed.data.id));

        revalidatePath("/cash-balance");
        return { success: true, error: null };
    } catch (error) {
        console.error("[editBalanceSheetAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat mengubah data.",
        };
    }
}
