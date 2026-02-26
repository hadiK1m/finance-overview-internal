import { z } from "zod/v4";

/* ─────────────── Update Profile ─────────────── */
export const updateProfileSchema = z.object({
    firstName: z.string().min(1, "Nama depan wajib diisi"),
    lastName: z.string().min(1, "Nama belakang wajib diisi"),
    phone: z
        .string()
        .max(30, "Nomor telepon terlalu panjang")
        .regex(/^(\+?[\d\s\-()]*)?$/, "Format nomor telepon tidak valid")
        .optional()
        .or(z.literal("")),
    bio: z
        .string()
        .max(300, "Bio maksimal 300 karakter")
        .optional()
        .or(z.literal("")),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

/* ─────────────── Change Password ─────────────── */
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
        newPassword: z
            .string()
            .min(8, "Password baru minimal 8 karakter")
            .regex(/[A-Z]/, "Harus mengandung minimal 1 huruf besar")
            .regex(/[0-9]/, "Harus mengandung minimal 1 angka")
            .regex(
                /[^A-Za-z0-9]/,
                "Harus mengandung minimal 1 simbol (!@#$...)",
            ),
        confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
    });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
