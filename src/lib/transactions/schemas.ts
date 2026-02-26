import { z } from "zod/v4";

/* ─────────────── Shared Types ─────────────── */

export type ItemOption = {
    id: string;
    name: string;
    rkapId: string;
    rkapName: string | null;
};

export type AccountOption = {
    id: string;
    name: string;
    balance: string;
};

export type TransactionWithDetails = {
    id: string;
    date: Date;
    rkapId: string;
    rkapName: string | null;
    items: { id: string; name: string }[];
    recipientName: string;
    amount: string;
    type: string;
    accountName: string;
    attachmentPath: string | null;
    attachmentName: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/* ─────────────── Tambah Transaksi ─────────────── */

export const addTransactionSchema = z.object({
    date: z.date(),
    itemIds: z.array(z.string()).min(1, "Minimal satu item harus dipilih"),
    rkapId: z.string().min(1, "RKAP wajib dipilih"),
    recipientName: z.string().min(1, "Nama penerima wajib diisi"),
    amount: z.number().min(0, "Jumlah tidak boleh negatif"),
    type: z.enum(["income", "expense"]),
    accountName: z.string().min(1, "Nama akun wajib diisi"),
});

export type AddTransactionValues = z.infer<typeof addTransactionSchema>;

/* ─────────────── Edit Transaksi ─────────────── */

export const editTransactionSchema = z.object({
    id: z.string().min(1),
    date: z.date(),
    itemIds: z.array(z.string()).min(1, "Minimal satu item harus dipilih"),
    rkapId: z.string().min(1, "RKAP wajib dipilih"),
    recipientName: z.string().min(1, "Nama penerima wajib diisi"),
    amount: z.number().min(0, "Jumlah tidak boleh negatif"),
    type: z.enum(["income", "expense"]),
    accountName: z.string().min(1, "Nama akun wajib diisi"),
});

export type EditTransactionValues = z.infer<typeof editTransactionSchema>;
