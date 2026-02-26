import { z } from "zod/v4";
import { USER_ROLES, INVITE_STATUSES } from "@/db/schema";

/* ══════════════════════════════════════════════════════
   Team Management Zod Schemas
   ══════════════════════════════════════════════════════ */

/** Role labels for UI display — maps enum to human-readable bahasa campur */
export const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    komisaris: "Komisaris",
    user: "User",
};

/** Status label & color mapping */
export const STATUS_CONFIG: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    active: { label: "Active", variant: "default" },
    inactive: { label: "Inactive", variant: "destructive" },
};

export const INVITE_STATUS_CONFIG: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    pending: { label: "Pending", variant: "outline" },
    accepted: { label: "Accepted", variant: "default" },
    expired: { label: "Expired", variant: "secondary" },
    revoked: { label: "Revoked", variant: "destructive" },
};

/* ── Invite member form schema ── */
export const inviteMembersSchema = z.object({
    emails: z
        .string()
        .min(1, "Email wajib diisi")
        .refine(
            (val) => {
                const list = val
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean);
                return list.length > 0 && list.every((e) => z.email().safeParse(e).success);
            },
            { message: "Satu atau lebih email tidak valid" },
        ),
    role: z.enum(USER_ROLES),
    message: z.string().max(500, "Pesan terlalu panjang").optional(),
});

export type InviteMembersInput = z.infer<typeof inviteMembersSchema>;

/* ── Edit user form schema ── */
export const editUserSchema = z.object({
    id: z.string().uuid(),
    firstName: z.string().min(1, "Nama depan wajib diisi").max(150),
    lastName: z.string().min(1, "Nama belakang wajib diisi").max(150),
    role: z.enum(USER_ROLES),
    isActive: z.boolean(),
});

export type EditUserInput = z.infer<typeof editUserSchema>;

/* ── Filter params for the table ── */
export const teamFilterSchema = z.object({
    search: z.string().optional(),
    role: z.enum([...USER_ROLES, "all"]).optional(),
    status: z.enum(["all", "active", "inactive"]).optional(),
});

/* ── Re-export for convenience ── */
export { USER_ROLES, INVITE_STATUSES };
