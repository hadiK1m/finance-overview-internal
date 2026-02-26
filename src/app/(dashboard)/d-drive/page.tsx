import type { Metadata } from "next";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { driveFolders, driveFiles } from "@/db/schema";
import { requireAuth } from "@/lib/auth/config";
import DriveClient from "./_components/DriveClient";

/* ══════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "D Drive — SISKEUKOM",
    description: "Personal cloud storage",
};

/* ══════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════ */

export default async function DrivePage({
    searchParams,
}: {
    searchParams: Promise<{
        folderId?: string;
        view?: string;
        q?: string;
    }>;
}) {
    const user = await requireAuth();
    const { folderId, view, q } = await searchParams;

    const currentFolderId = folderId || null;
    const currentView = view || "my-drive";

    /* ── Fetch data based on current view ── */
    let folders: (typeof driveFolders.$inferSelect)[] = [];
    let files: (typeof driveFiles.$inferSelect)[] = [];

    if (currentView === "trash") {
        // Trashed items
        folders = await db
            .select()
            .from(driveFolders)
            .where(
                and(
                    eq(driveFolders.userId, user.userId),
                    eq(driveFolders.isTrashed, true),
                ),
            )
            .orderBy(desc(driveFolders.trashedAt));

        files = await db
            .select()
            .from(driveFiles)
            .where(
                and(
                    eq(driveFiles.userId, user.userId),
                    eq(driveFiles.isTrashed, true),
                ),
            )
            .orderBy(desc(driveFiles.trashedAt));
    } else if (currentView === "recent") {
        // Recent files only (last 50)
        files = await db
            .select()
            .from(driveFiles)
            .where(
                and(
                    eq(driveFiles.userId, user.userId),
                    eq(driveFiles.isTrashed, false),
                ),
            )
            .orderBy(desc(driveFiles.updatedAt))
            .limit(50);
    } else {
        // My Drive — folder contents
        const folderFilter = currentFolderId
            ? eq(driveFolders.parentId, currentFolderId)
            : isNull(driveFolders.parentId);

        folders = await db
            .select()
            .from(driveFolders)
            .where(
                and(
                    eq(driveFolders.userId, user.userId),
                    eq(driveFolders.isTrashed, false),
                    folderFilter,
                ),
            )
            .orderBy(driveFolders.name);

        const fileFilter = currentFolderId
            ? eq(driveFiles.folderId, currentFolderId)
            : isNull(driveFiles.folderId);

        files = await db
            .select()
            .from(driveFiles)
            .where(
                and(
                    eq(driveFiles.userId, user.userId),
                    eq(driveFiles.isTrashed, false),
                    fileFilter,
                ),
            )
            .orderBy(driveFiles.name);
    }

    /* ── Build breadcrumbs ── */
    const breadcrumbs: { id: string | null; name: string }[] = [
        { id: null, name: "My Drive" },
    ];

    if (currentFolderId && currentView !== "trash" && currentView !== "recent") {
        let fId: string | null = currentFolderId;
        const parts: { id: string; name: string }[] = [];

        while (fId) {
            const [folder] = await db
                .select({
                    id: driveFolders.id,
                    name: driveFolders.name,
                    parentId: driveFolders.parentId,
                })
                .from(driveFolders)
                .where(
                    and(
                        eq(driveFolders.id, fId),
                        eq(driveFolders.userId, user.userId),
                    ),
                );
            if (!folder) break;
            parts.unshift({ id: folder.id, name: folder.name });
            fId = folder.parentId;
        }

        breadcrumbs.push(...parts);
    }

    /* ── Storage usage ── */
    const [usage] = await db
        .select({
            total: sql<string>`COALESCE(SUM(${driveFiles.size}), 0)`,
        })
        .from(driveFiles)
        .where(eq(driveFiles.userId, user.userId));

    /* ── Render ── */
    return (
        <div className="space-y-6">
            {/* Page heading */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">D Drive</h1>
                <p className="text-sm text-muted-foreground">
                    Personal cloud storage — kelola file dan folder Anda
                </p>
            </div>

            {/* Drive UI */}
            <DriveClient
                folders={folders}
                files={files}
                breadcrumbs={breadcrumbs}
                currentFolderId={currentFolderId}
                currentView={currentView}
                storageUsed={Number(usage?.total || 0)}
                searchQuery={q || ""}
            />
        </div>
    );
}
