import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users, teamInvites } from "@/db/schema";
import { requireAuth, isAdminOrAbove } from "@/lib/auth/config";
import TeamsClient from "./_components/TeamsClient";

/* ══════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Tim & Akses — SISKEUKOM",
    description: "Kelola anggota tim dan hak akses",
};

/* ══════════════════════════════════════════════
   Page Component (Server)
   ══════════════════════════════════════════════ */

export default async function TeamsPage() {
    // Permission guard: only admin or super_admin
    const currentUser = await requireAuth();
    if (!isAdminOrAbove(currentUser.role)) {
        redirect("/dashboard");
    }

    /* ── Fetch all users ── */
    const allUsers = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
            image: users.image,
            createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

    /* ── Fetch pending invites ── */
    const pendingInvites = await db
        .select({
            id: teamInvites.id,
            email: teamInvites.email,
            role: teamInvites.role,
            status: teamInvites.status,
            message: teamInvites.message,
            expiresAt: teamInvites.expiresAt,
            createdAt: teamInvites.createdAt,
        })
        .from(teamInvites)
        .where(eq(teamInvites.status, "pending"))
        .orderBy(desc(teamInvites.createdAt));

    /* ── Compute stats ── */
    const totalMembers = allUsers.length;
    const activeMembers = allUsers.filter((u) => u.isActive).length;
    const pendingCount = pendingInvites.length;

    // Most common role
    const roleCounts = new Map<string, number>();
    for (const u of allUsers) {
        roleCounts.set(u.role, (roleCounts.get(u.role) || 0) + 1);
    }
    let topRole = "user";
    let topRoleCount = 0;
    for (const [role, count] of roleCounts) {
        if (count > topRoleCount) {
            topRole = role;
            topRoleCount = count;
        }
    }

    return (
        <div className="space-y-8">
            {/* Page heading */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Tim & Akses
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola anggota tim, role, dan undangan
                </p>
            </div>

            {/* Client-side interactive UI */}
            <TeamsClient
                users={allUsers}
                pendingInvites={pendingInvites}
                stats={{
                    totalMembers,
                    activeMembers,
                    pendingCount,
                    topRole,
                    topRoleCount,
                }}
                currentUserId={currentUser.userId}
                currentUserRole={currentUser.role}
            />
        </div>
    );
}
