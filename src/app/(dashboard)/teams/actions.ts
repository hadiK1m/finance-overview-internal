"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
    users,
    teamInvites,
    type UserRole,
} from "@/db/schema";
import { requireAuth, isAdminOrAbove } from "@/lib/auth/config";
import {
    inviteMembersSchema,
    editUserSchema,
    type InviteMembersInput,
    type EditUserInput,
} from "@/lib/teams/schemas";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ────────────── Auth guard: admin or super_admin only ────────────── */
async function requireManageAccess() {
    const user = await requireAuth();
    if (!isAdminOrAbove(user.role)) {
        throw new Error("Unauthorized: only admin/super_admin can manage team.");
    }
    return user;
}

/* ══════════════════════════════════════════════
   Invite Members
   ══════════════════════════════════════════════ */

export async function inviteMembersAction(
    input: InviteMembersInput,
): Promise<ActionResult> {
    const parsed = inviteMembersSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Data undangan tidak valid." };
    }

    const user = await requireManageAccess();
    const { emails, role, message } = parsed.data;

    // Parse comma-separated emails
    const emailList = emails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    // Prevent inviting yourself
    const filteredEmails = emailList.filter((e) => e !== user.email);
    if (filteredEmails.length === 0) {
        return { success: false, error: "Tidak bisa mengundang diri sendiri." };
    }

    // Non-super_admin cannot assign super_admin role
    if (role === "super_admin" && user.role !== "super_admin") {
        return {
            success: false,
            error: "Hanya Super Admin yang bisa mengundang Super Admin baru.",
        };
    }

    // 7-day expiry for invites
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const values = filteredEmails.map((email) => ({
        email,
        role: role as UserRole,
        message: message || null,
        invitedBy: user.userId,
        status: "pending" as const,
        expiresAt,
    }));

    await db.insert(teamInvites).values(values);

    // AUDIT: invite created by user.userId at new Date()
    revalidatePath("/teams");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Edit User (role, name, status)
   ══════════════════════════════════════════════ */

export async function editUserAction(
    input: EditUserInput,
): Promise<ActionResult> {
    const parsed = editUserSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Data tidak valid." };
    }

    const currentUser = await requireManageAccess();
    const { id, firstName, lastName, role, isActive } = parsed.data;

    // Prevent non-super_admin from promoting to super_admin
    if (role === "super_admin" && currentUser.role !== "super_admin") {
        return {
            success: false,
            error: "Hanya Super Admin yang bisa menetapkan role Super Admin.",
        };
    }

    // Prevent user from demoting themselves
    if (id === currentUser.userId && role !== currentUser.role) {
        return {
            success: false,
            error: "Anda tidak bisa mengubah role diri sendiri.",
        };
    }

    // Prevent deactivating yourself
    if (id === currentUser.userId && !isActive) {
        return {
            success: false,
            error: "Anda tidak bisa menonaktifkan akun Anda sendiri.",
        };
    }

    await db
        .update(users)
        .set({ firstName, lastName, role, isActive })
        .where(eq(users.id, id));

    // AUDIT: user edited by currentUser.userId at new Date()
    revalidatePath("/teams");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Toggle User Active Status
   ══════════════════════════════════════════════ */

export async function toggleUserStatusAction(
    userId: string,
): Promise<ActionResult> {
    const currentUser = await requireManageAccess();

    if (userId === currentUser.userId) {
        return {
            success: false,
            error: "Anda tidak bisa menonaktifkan akun Anda sendiri.",
        };
    }

    // Single atomic UPDATE — avoids TOCTOU race of SELECT-then-UPDATE
    const result = await db
        .update(users)
        .set({ isActive: sql`NOT ${users.isActive}` })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

    if (result.length === 0) {
        return { success: false, error: "User tidak ditemukan." };
    }

    // AUDIT: status toggled by currentUser.userId at new Date()
    revalidatePath("/teams");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Delete User (permanent — use with caution)
   ══════════════════════════════════════════════ */

export async function deleteUserAction(
    userId: string,
): Promise<ActionResult> {
    const currentUser = await requireManageAccess();

    if (userId === currentUser.userId) {
        return {
            success: false,
            error: "Anda tidak bisa menghapus akun Anda sendiri.",
        };
    }

    // Only super_admin can permanently delete
    if (currentUser.role !== "super_admin") {
        return {
            success: false,
            error: "Hanya Super Admin yang bisa menghapus anggota.",
        };
    }

    await db.delete(users).where(eq(users.id, userId));

    // AUDIT: user deleted by currentUser.userId at new Date()
    revalidatePath("/teams");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Revoke Invite
   ══════════════════════════════════════════════ */

export async function revokeInviteAction(
    inviteId: string,
): Promise<ActionResult> {
    await requireManageAccess();

    await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(
            and(
                eq(teamInvites.id, inviteId),
                eq(teamInvites.status, "pending"),
            ),
        );

    // AUDIT: invite revoked at new Date()
    revalidatePath("/teams");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Delete Invite (permanent remove from table)
   ══════════════════════════════════════════════ */

export async function deleteInviteAction(
    inviteId: string,
): Promise<ActionResult> {
    await requireManageAccess();

    await db.delete(teamInvites).where(eq(teamInvites.id, inviteId));

    revalidatePath("/teams");
    return { success: true, error: null };
}
