import { z } from "zod/v4";

/* ─────────────── Tambah Nama Akun ─────────────── */
export const addBalanceSheetSchema = z.object({
    name: z.string().min(1, "Nama akun wajib diisi"),
    balance: z.number().min(0, "Saldo tidak boleh negatif"),
    date: z.date(),
});

export type AddBalanceSheetValues = z.infer<typeof addBalanceSheetSchema>;

/* ─────────────── Edit Nama Akun ─────────────── */
export const editBalanceSheetSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, "Nama akun wajib diisi"),
    balance: z.number().min(0, "Saldo tidak boleh negatif"),
    date: z.date(),
});

export type EditBalanceSheetValues = z.infer<typeof editBalanceSheetSchema>;
