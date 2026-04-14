import { z } from "zod/v4";

/* ─────────────── Shared Types ─────────────── */

export type BalanceRkapWithName = {
    id: string;
    rkapId: string;
    rkapName: string | null;
    balance: string;
    date: Date;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/* ─────────────── Tambah Saldo RKAP ─────────────── */

export const addBalanceRkapSchema = z.object({
    rkapName: z.string().min(1, "Nama RKAP wajib diisi"),
    balance: z.number().min(0, "Saldo tidak boleh negatif"),
    date: z.date(),
});

export type AddBalanceRkapValues = z.infer<typeof addBalanceRkapSchema>;

/* ─────────────── Edit Saldo RKAP ─────────────── */

export const editBalanceRkapSchema = z.object({
    id: z.string().min(1),
    rkapName: z.string().min(1, "Nama RKAP wajib diisi"),
    balance: z.number().min(0, "Saldo tidak boleh negatif"),
    date: z.date(),
});

export type EditBalanceRkapValues = z.infer<typeof editBalanceRkapSchema>;
