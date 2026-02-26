"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { balanceRkap, rkapNames } from "@/db/schema";
import {
    addBalanceRkapSchema,
    editBalanceRkapSchema,
    type AddBalanceRkapValues,
    type EditBalanceRkapValues,
} from "@/lib/balance-rkap/schemas";
import { requirePermission } from "@/lib/auth/config";
import { z } from "zod/v4";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Helper: find or create RKAP name
   ══════════════════════════════════════════════ */

async function findOrCreateRkap(name: string, userId: string) {
    const [rkap] = await db
        .insert(rkapNames)
        .values({ name, createdBy: userId })
        .onConflictDoUpdate({
            target: rkapNames.name,
            set: { name },
        })
        .returning();

    return rkap;
}

/* ══════════════════════════════════════════════
   Tambah Saldo RKAP
   ══════════════════════════════════════════════ */

export async function addBalanceRkapAction(
    data: AddBalanceRkapValues,
): Promise<ActionResult> {
    const parsed = addBalanceRkapSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    try {
        const user = await requirePermission("create");
        const rkap = await findOrCreateRkap(
            parsed.data.rkapName,
            user.userId,
        );

        await db.insert(balanceRkap).values({
            rkapId: rkap.id,
            balance: String(parsed.data.balance),
            date: parsed.data.date,
            createdBy: user.userId,
        });

        revalidatePath("/balance-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[addBalanceRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan. Silakan coba lagi.",
        };
    }
}

/* ══════════════════════════════════════════════
   Hapus Saldo RKAP (Batch)
   ══════════════════════════════════════════════ */

export async function deleteBalanceRkapAction(
    ids: string[],
): Promise<ActionResult> {
    const parsed = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!parsed.success) {
        return { success: false, error: "Tidak ada data yang dipilih." };
    }

    try {
        await requirePermission("delete:own");
        await db.delete(balanceRkap).where(inArray(balanceRkap.id, parsed.data));

        revalidatePath("/balance-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[deleteBalanceRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat menghapus data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Edit Saldo RKAP
   ══════════════════════════════════════════════ */

export async function editBalanceRkapAction(
    data: EditBalanceRkapValues,
): Promise<ActionResult> {
    const parsed = editBalanceRkapSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    try {
        const user = await requirePermission("update:own");
        const rkap = await findOrCreateRkap(
            parsed.data.rkapName,
            user.userId,
        );

        await db
            .update(balanceRkap)
            .set({
                rkapId: rkap.id,
                balance: String(parsed.data.balance),
                date: parsed.data.date,
            })
            .where(eq(balanceRkap.id, parsed.data.id));

        revalidatePath("/balance-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[editBalanceRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat mengubah data.",
        };
    }
}
