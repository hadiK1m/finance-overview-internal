import { z } from "zod/v4";

/* ─────────────── Shared Types ─────────────── */

export type ItemWithRkap = {
    id: string;
    name: string;
    rkapId: string;
    rkapName: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/* ─────────────── Tambah Items & RKAP ─────────────── */

export const addItemRkapSchema = z.object({
    itemNames: z
        .array(z.string().min(1, "Nama item tidak boleh kosong"))
        .min(1, "Minimal satu item harus diisi"),
    rkapName: z.string().min(1, "Nama RKAP wajib diisi"),
});

export type AddItemRkapValues = z.infer<typeof addItemRkapSchema>;

/* ─────────────── Edit Item ─────────────── */

export const editItemRkapSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, "Nama item wajib diisi"),
    rkapName: z.string().min(1, "Nama RKAP wajib diisi"),
});

export type EditItemRkapValues = z.infer<typeof editItemRkapSchema>;
