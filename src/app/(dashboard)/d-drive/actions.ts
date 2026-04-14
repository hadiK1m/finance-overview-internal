"use server";

import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { driveFolders, driveFiles } from "@/db/schema";
import { requireAuth } from "@/lib/auth/config";
import {
    createFolderSchema,
    renameItemSchema,
    moveItemsSchema,
} from "@/lib/drive/schemas";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ────────────── Storage helper ────────────── */
function getStorageDir(userId: string) {
    return path.join(process.cwd(), "storage", "drive", userId);
}

/* ══════════════════════════════════════════════
   Create Folder
   ══════════════════════════════════════════════ */

export async function createFolderAction(
    name: string,
    parentId: string | null,
): Promise<ActionResult> {
    const parsed = createFolderSchema.safeParse({ name, parentId });
    if (!parsed.success) {
        return { success: false, error: "Nama folder tidak valid." };
    }

    const user = await requireAuth();

    // Verify parent folder ownership
    if (parentId) {
        const [parent] = await db
            .select({ id: driveFolders.id })
            .from(driveFolders)
            .where(
                and(
                    eq(driveFolders.id, parentId),
                    eq(driveFolders.userId, user.userId),
                ),
            );
        if (!parent) {
            return { success: false, error: "Folder induk tidak ditemukan." };
        }
    }

    await db.insert(driveFolders).values({
        name: parsed.data.name,
        parentId: parsed.data.parentId,
        userId: user.userId,
    });

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Upload Files
   ══════════════════════════════════════════════ */

export async function uploadFilesAction(
    formData: FormData,
): Promise<ActionResult> {
    const user = await requireAuth();
    const folderId = (formData.get("folderId") as string) || null;
    const files = formData.getAll("files") as File[];

    if (!files.length || files[0].size === 0) {
        return { success: false, error: "Tidak ada file yang dipilih." };
    }

    // Verify folder ownership
    if (folderId) {
        const [folder] = await db
            .select({ id: driveFolders.id })
            .from(driveFolders)
            .where(
                and(
                    eq(driveFolders.id, folderId),
                    eq(driveFolders.userId, user.userId),
                ),
            );
        if (!folder) {
            return { success: false, error: "Folder tidak ditemukan." };
        }
    }

    const storageDir = getStorageDir(user.userId);
    await mkdir(storageDir, { recursive: true });

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const BLOCKED_EXTENSIONS = new Set([
        ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
        ".vbs", ".vbe", ".js", ".jse", ".ws", ".wsf", ".wsc",
        ".wsh", ".ps1", ".ps2", ".psc1", ".psc2", ".reg", ".lnk",
        ".inf", ".cpl", ".hta", ".jar", ".sh", ".bash",
    ]);

    for (const file of files) {
        if (file.size > MAX_SIZE) {
            return {
                success: false,
                error: `File "${file.name}" terlalu besar. Maksimum 50 MB.`,
            };
        }

        const ext = (path.extname(file.name) || "").toLowerCase();
        if (BLOCKED_EXTENSIONS.has(ext)) {
            return {
                success: false,
                error: `Tipe file "${ext}" tidak diizinkan.`,
            };
        }

        const filename = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(storageDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        await db.insert(driveFiles).values({
            name: file.name,
            folderId,
            userId: user.userId,
            size: String(file.size),
            mimeType: file.type || "application/octet-stream",
            storagePath: `storage/drive/${user.userId}/${filename}`,
        });
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Rename Item
   ══════════════════════════════════════════════ */

export async function renameItemAction(
    id: string,
    type: "file" | "folder",
    newName: string,
): Promise<ActionResult> {
    const parsed = renameItemSchema.safeParse({ id, type, newName });
    if (!parsed.success) {
        return { success: false, error: "Nama tidak valid." };
    }

    const user = await requireAuth();

    if (type === "folder") {
        await db
            .update(driveFolders)
            .set({ name: newName })
            .where(
                and(
                    eq(driveFolders.id, id),
                    eq(driveFolders.userId, user.userId),
                ),
            );
    } else {
        await db
            .update(driveFiles)
            .set({ name: newName })
            .where(
                and(
                    eq(driveFiles.id, id),
                    eq(driveFiles.userId, user.userId),
                ),
            );
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Move Items
   ══════════════════════════════════════════════ */

export async function moveItemsAction(
    items: { id: string; type: "file" | "folder" }[],
    targetFolderId: string | null,
): Promise<ActionResult> {
    const parsed = moveItemsSchema.safeParse({ items, targetFolderId });
    if (!parsed.success) {
        return { success: false, error: "Data tidak valid." };
    }

    const user = await requireAuth();

    // Verify target folder
    if (targetFolderId) {
        const [target] = await db
            .select({ id: driveFolders.id })
            .from(driveFolders)
            .where(
                and(
                    eq(driveFolders.id, targetFolderId),
                    eq(driveFolders.userId, user.userId),
                ),
            );
        if (!target) {
            return { success: false, error: "Folder tujuan tidak ditemukan." };
        }
    }

    for (const item of items) {
        if (item.type === "folder") {
            // Prevent moving folder into itself
            if (item.id === targetFolderId) {
                return {
                    success: false,
                    error: "Tidak bisa memindahkan folder ke dalam dirinya sendiri.",
                };
            }
            await db
                .update(driveFolders)
                .set({ parentId: targetFolderId })
                .where(
                    and(
                        eq(driveFolders.id, item.id),
                        eq(driveFolders.userId, user.userId),
                    ),
                );
        } else {
            await db
                .update(driveFiles)
                .set({ folderId: targetFolderId })
                .where(
                    and(
                        eq(driveFiles.id, item.id),
                        eq(driveFiles.userId, user.userId),
                    ),
                );
        }
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Trash Items (soft-delete)
   ══════════════════════════════════════════════ */

export async function trashItemsAction(
    items: { id: string; type: "file" | "folder" }[],
): Promise<ActionResult> {
    if (!items.length) {
        return { success: false, error: "Tidak ada item yang dipilih." };
    }

    const user = await requireAuth();
    const now = new Date();

    for (const item of items) {
        if (item.type === "folder") {
            await db
                .update(driveFolders)
                .set({ isTrashed: true, trashedAt: now })
                .where(
                    and(
                        eq(driveFolders.id, item.id),
                        eq(driveFolders.userId, user.userId),
                    ),
                );
        } else {
            await db
                .update(driveFiles)
                .set({ isTrashed: true, trashedAt: now })
                .where(
                    and(
                        eq(driveFiles.id, item.id),
                        eq(driveFiles.userId, user.userId),
                    ),
                );
        }
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Restore Items from Trash
   ══════════════════════════════════════════════ */

export async function restoreItemsAction(
    items: { id: string; type: "file" | "folder" }[],
): Promise<ActionResult> {
    if (!items.length) {
        return { success: false, error: "Tidak ada item yang dipilih." };
    }

    const user = await requireAuth();

    for (const item of items) {
        if (item.type === "folder") {
            await db
                .update(driveFolders)
                .set({ isTrashed: false, trashedAt: null })
                .where(
                    and(
                        eq(driveFolders.id, item.id),
                        eq(driveFolders.userId, user.userId),
                    ),
                );
        } else {
            await db
                .update(driveFiles)
                .set({ isTrashed: false, trashedAt: null })
                .where(
                    and(
                        eq(driveFiles.id, item.id),
                        eq(driveFiles.userId, user.userId),
                    ),
                );
        }
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Helper: get ALL descendant file storage paths
   ══════════════════════════════════════════════ */

async function getDescendantFilePaths(
    folderId: string,
    userId: string,
): Promise<string[]> {
    // BFS to collect all descendant folder IDs
    const allFolderIds: string[] = [folderId];
    let queue = [folderId];

    while (queue.length > 0) {
        const children = await db
            .select({ id: driveFolders.id })
            .from(driveFolders)
            .where(
                and(
                    inArray(driveFolders.parentId, queue),
                    eq(driveFolders.userId, userId),
                ),
            );

        if (children.length === 0) break;
        queue = children.map((c) => c.id);
        allFolderIds.push(...queue);
    }

    // Get all files in those folders
    const files = await db
        .select({ storagePath: driveFiles.storagePath })
        .from(driveFiles)
        .where(
            and(
                inArray(driveFiles.folderId, allFolderIds),
                eq(driveFiles.userId, userId),
            ),
        );

    return files.map((f) => f.storagePath);
}

/* ══════════════════════════════════════════════
   Permanent Delete Items
   ══════════════════════════════════════════════ */

export async function permanentDeleteItemsAction(
    items: { id: string; type: "file" | "folder" }[],
): Promise<ActionResult> {
    if (!items.length) {
        return { success: false, error: "Tidak ada item yang dipilih." };
    }

    const user = await requireAuth();

    for (const item of items) {
        if (item.type === "folder") {
            // Collect all descendant file paths for disk cleanup
            const paths = await getDescendantFilePaths(item.id, user.userId);

            // Delete files from disk
            for (const p of paths) {
                const absPath = path.join(process.cwd(), p);
                await unlink(absPath).catch(() => { });
            }

            // Delete folder from DB (cascade removes children & files)
            await db
                .delete(driveFolders)
                .where(
                    and(
                        eq(driveFolders.id, item.id),
                        eq(driveFolders.userId, user.userId),
                    ),
                );
        } else {
            // Get file path for disk cleanup
            const [file] = await db
                .select({ storagePath: driveFiles.storagePath })
                .from(driveFiles)
                .where(
                    and(
                        eq(driveFiles.id, item.id),
                        eq(driveFiles.userId, user.userId),
                    ),
                );

            if (file) {
                const absPath = path.join(process.cwd(), file.storagePath);
                await unlink(absPath).catch(() => { });
            }

            await db
                .delete(driveFiles)
                .where(
                    and(
                        eq(driveFiles.id, item.id),
                        eq(driveFiles.userId, user.userId),
                    ),
                );
        }
    }

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Empty Trash
   ══════════════════════════════════════════════ */

export async function emptyTrashAction(): Promise<ActionResult> {
    const user = await requireAuth();

    // Get all trashed files to clean up disk
    const trashedFiles = await db
        .select({ storagePath: driveFiles.storagePath })
        .from(driveFiles)
        .where(
            and(
                eq(driveFiles.userId, user.userId),
                eq(driveFiles.isTrashed, true),
            ),
        );

    // Also get files inside trashed folders
    const trashedFolders = await db
        .select({ id: driveFolders.id })
        .from(driveFolders)
        .where(
            and(
                eq(driveFolders.userId, user.userId),
                eq(driveFolders.isTrashed, true),
            ),
        );

    for (const folder of trashedFolders) {
        const paths = await getDescendantFilePaths(folder.id, user.userId);
        for (const p of paths) {
            const absPath = path.join(process.cwd(), p);
            await unlink(absPath).catch(() => { });
        }
    }

    // Delete trashed files from disk
    for (const file of trashedFiles) {
        const absPath = path.join(process.cwd(), file.storagePath);
        await unlink(absPath).catch(() => { });
    }

    // Delete from DB
    await db
        .delete(driveFiles)
        .where(
            and(
                eq(driveFiles.userId, user.userId),
                eq(driveFiles.isTrashed, true),
            ),
        );

    await db
        .delete(driveFolders)
        .where(
            and(
                eq(driveFolders.userId, user.userId),
                eq(driveFolders.isTrashed, true),
            ),
        );

    revalidatePath("/d-drive");
    return { success: true, error: null };
}

/* ══════════════════════════════════════════════
   Get Folder Tree (for Move dialog)
   ══════════════════════════════════════════════ */

export async function getFolderTreeAction(): Promise<
    { id: string; name: string; parentId: string | null }[]
> {
    const user = await requireAuth();

    return db
        .select({
            id: driveFolders.id,
            name: driveFolders.name,
            parentId: driveFolders.parentId,
        })
        .from(driveFolders)
        .where(
            and(
                eq(driveFolders.userId, user.userId),
                eq(driveFolders.isTrashed, false),
            ),
        )
        .orderBy(driveFolders.name);
}
