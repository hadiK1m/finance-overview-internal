"use server";

import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
    updateProfileSchema,
    changePasswordSchema,
    type UpdateProfileValues,
    type ChangePasswordValues,
} from "@/lib/settings/schemas";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Update Profile
   ══════════════════════════════════════════════ */

export async function updateProfileAction(
    data: UpdateProfileValues,
): Promise<ActionResult> {
    const parsed = updateProfileSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Data tidak valid. Periksa kembali input Anda." };
    }

    try {
        const user = await requireAuth();

        await db
            .update(users)
            .set({
                firstName: parsed.data.firstName,
                lastName: parsed.data.lastName,
                phone: parsed.data.phone || null,
                bio: parsed.data.bio || null,
            })
            .where(eq(users.id, user.userId));

        revalidatePath("/settings");
        return { success: true, error: null };
    } catch (error) {
        console.error("[updateProfileAction] Error:", error);
        return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
    }
}

/* ══════════════════════════════════════════════
   Upload Avatar
   ──────────────────────────────────────────────
   Saves to: public/avatars/<userId>.<ext>
   Stores DB value as: /avatars/<userId>.<ext>
   ══════════════════════════════════════════════ */

/** Allowed image MIME types */
const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

/** Max file size: 5 MB */
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadAvatarAction(
    formData: FormData,
): Promise<ActionResult> {
    try {
        const user = await requireAuth();

        const file = formData.get("avatar") as File | null;
        if (!file || file.size === 0) {
            return { success: false, error: "Tidak ada file yang dipilih." };
        }

        // Validate MIME type
        if (!ALLOWED_MIME.has(file.type)) {
            return {
                success: false,
                error: "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.",
            };
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            return { success: false, error: "Ukuran file maksimal 5 MB." };
        }

        // Determine extension from MIME
        const extMap: Record<string, string> = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        };
        const ext = extMap[file.type] ?? ".jpg";

        // Ensure directory exists
        const avatarsDir = path.join(process.cwd(), "public", "avatars");
        await mkdir(avatarsDir, { recursive: true });

        // Write file — filename is deterministic per user (overwrite previous)
        const filename = `${user.userId}${ext}`;
        const filePath = path.join(avatarsDir, filename);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // Persist URL in DB
        const avatarUrl = `/avatars/${filename}`;
        await db
            .update(users)
            .set({ image: avatarUrl })
            .where(eq(users.id, user.userId));

        revalidatePath("/settings");
        return { success: true, error: null };
    } catch (error) {
        console.error("[uploadAvatarAction] Error:", error);
        return { success: false, error: "Gagal mengupload avatar." };
    }
}

/* ══════════════════════════════════════════════
   Remove Avatar
   ══════════════════════════════════════════════ */

export async function removeAvatarAction(): Promise<ActionResult> {
    try {
        const user = await requireAuth();

        // Get current avatar path from DB
        const [row] = await db
            .select({ image: users.image })
            .from(users)
            .where(eq(users.id, user.userId))
            .limit(1);

        // Delete file from disk if exists
        if (row?.image) {
            const filePath = path.join(process.cwd(), "public", row.image);
            try {
                await unlink(filePath);
            } catch {
                // File may not exist on disk — that's fine
            }
        }

        // Clear from DB
        await db
            .update(users)
            .set({ image: null })
            .where(eq(users.id, user.userId));

        revalidatePath("/settings");
        return { success: true, error: null };
    } catch (error) {
        console.error("[removeAvatarAction] Error:", error);
        return { success: false, error: "Gagal menghapus avatar." };
    }
}

/* ══════════════════════════════════════════════
   Change Password
   ──────────────────────────────────────────────
   1. Verify current password against stored hash
   2. Hash new password with Argon2id
   3. Update in DB
   ══════════════════════════════════════════════ */

export async function changePasswordAction(
    data: ChangePasswordValues,
): Promise<ActionResult> {
    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Data tidak valid. Periksa kembali input Anda." };
    }

    try {
        const sessionUser = await requireAuth();

        // 1. Fetch current password hash (NEVER expose to client)
        const [user] = await db
            .select({ passwordHash: users.passwordHash })
            .from(users)
            .where(eq(users.id, sessionUser.userId))
            .limit(1);

        if (!user) {
            return { success: false, error: "User tidak ditemukan." };
        }

        // 2. Verify current password
        const isValid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
        if (!isValid) {
            return { success: false, error: "Password saat ini salah." };
        }

        // 3. Prevent reuse — new password must differ from current
        const isSame = await verifyPassword(user.passwordHash, parsed.data.newPassword);
        if (isSame) {
            return { success: false, error: "Password baru tidak boleh sama dengan password saat ini." };
        }

        // 4. Hash & persist new password
        const newHash = await hashPassword(parsed.data.newPassword);
        await db
            .update(users)
            .set({ passwordHash: newHash })
            .where(eq(users.id, sessionUser.userId));

        revalidatePath("/settings");
        return { success: true, error: null };
    } catch (error) {
        console.error("[changePasswordAction] Error:", error);
        return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
    }
}
