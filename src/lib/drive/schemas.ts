import { z } from "zod/v4";

/* ══════════════════════════════════════════════════════
   Shared Types for D-Drive
   ══════════════════════════════════════════════════════ */

/** Unified item reference (used in multi-select operations) */
export type DriveItemRef = {
    id: string;
    name: string;
    type: "file" | "folder";
};

/** Breadcrumb segment */
export type BreadcrumbItem = {
    id: string | null; // null = root
    name: string;
};

/** Flat folder node (for move dialog tree) */
export type FolderNode = {
    id: string;
    name: string;
    parentId: string | null;
};

/* ══════════════════════════════════════════════════════
   Zod Validation Schemas
   ══════════════════════════════════════════════════════ */

export const createFolderSchema = z.object({
    name: z
        .string()
        .min(1, "Nama folder wajib diisi")
        .max(255, "Nama folder terlalu panjang"),
    parentId: z.string().uuid().nullable(),
});

export const renameItemSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(["file", "folder"]),
    newName: z
        .string()
        .min(1, "Nama wajib diisi")
        .max(255, "Nama terlalu panjang"),
});

export const moveItemsSchema = z.object({
    items: z
        .array(
            z.object({
                id: z.string().uuid(),
                type: z.enum(["file", "folder"]),
            }),
        )
        .min(1),
    targetFolderId: z.string().uuid().nullable(),
});

export const trashItemsSchema = z.object({
    items: z
        .array(
            z.object({
                id: z.string().uuid(),
                type: z.enum(["file", "folder"]),
            }),
        )
        .min(1),
});

/* ══════════════════════════════════════════════════════
   Utility: format bytes to human-readable string
   ══════════════════════════════════════════════════════ */

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
