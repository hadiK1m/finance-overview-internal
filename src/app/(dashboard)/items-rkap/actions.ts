"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, rkapNames } from "@/db/schema";
import {
    addItemRkapSchema,
    editItemRkapSchema,
    type AddItemRkapValues,
    type EditItemRkapValues,
} from "@/lib/items-rkap/schemas";
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
   Tambah Items & RKAP
   ══════════════════════════════════════════════ */

export async function addItemRkapAction(
    data: AddItemRkapValues,
): Promise<ActionResult> {
    const parsed = addItemRkapSchema.safeParse(data);

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

        await db.insert(items).values(
            parsed.data.itemNames.map((name) => ({
                name,
                rkapId: rkap.id,
                createdBy: user.userId,
            })),
        );

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[addItemRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan. Silakan coba lagi.",
        };
    }
}

/* ══════════════════════════════════════════════
   Hapus Items (Batch)
   ══════════════════════════════════════════════ */

export async function deleteItemsAction(
    ids: string[],
): Promise<ActionResult> {
    const parsed = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!parsed.success) {
        return { success: false, error: "Tidak ada data yang dipilih." };
    }

    try {
        await requirePermission("delete:own");
        await db.delete(items).where(inArray(items.id, parsed.data));

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[deleteItemsAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat menghapus data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Edit Item
   ══════════════════════════════════════════════ */

export async function editItemRkapAction(
    data: EditItemRkapValues,
): Promise<ActionResult> {
    const parsed = editItemRkapSchema.safeParse(data);

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
            .update(items)
            .set({ name: parsed.data.name, rkapId: rkap.id })
            .where(eq(items.id, parsed.data.id));

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[editItemRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat mengubah data.",
        };
    }
}
