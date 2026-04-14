"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, rkapNames } from "@/db/schema";
import {
    addItemRkapSchema,
    editItemRkapSchema,
    type AddItemRkapValues,
    type EditItemRkapValues,
} from "@/lib/items-rkap/schemas";
import { requirePermission } from "@/lib/auth/config";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Helper: find or create RKAP name
   ══════════════════════════════════════════════ */

async function findOrCreateRkap(name: string, userId: string) {
    const [rkap] = await db
        .insert(rkapNames)
        .values({ name, createdBy: userId })
        .onConflictDoUpdate({
            target: rkapNames.name,
            set: { name },
        })
        .returning();

    return rkap;
}

/* ══════════════════════════════════════════════
   Tambah Items & RKAP
   ══════════════════════════════════════════════ */

export async function addItemRkapAction(
    data: AddItemRkapValues,
): Promise<ActionResult> {
    const parsed = addItemRkapSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    try {
        const user = await requirePermission("create");
        const rkap = await findOrCreateRkap(
            parsed.data.rkapName,
            user.userId,
        );

        await db.insert(items).values(
            parsed.data.itemNames.map((name) => ({
                name,
                rkapId: rkap.id,
                createdBy: user.userId,
            })),
        );

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[addItemRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan. Silakan coba lagi.",
        };
    }
}

/* ══════════════════════════════════════════════
   Hapus Items (Batch)
   ══════════════════════════════════════════════ */

export async function deleteItemsAction(
    ids: string[],
): Promise<ActionResult> {
    const parsed = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!parsed.success) {
        return { success: false, error: "Tidak ada data yang dipilih." };
    }

    try {
        await requirePermission("delete:own");
        await db.delete(items).where(inArray(items.id, parsed.data));

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[deleteItemsAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat menghapus data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Edit Item
   ══════════════════════════════════════════════ */

export async function editItemRkapAction(
    data: EditItemRkapValues,
): Promise<ActionResult> {
    const parsed = editItemRkapSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            error: "Data tidak valid. Periksa kembali input Anda.",
        };
    }

    try {
        const user = await requirePermission("update:own");
        const rkap = await findOrCreateRkap(
            parsed.data.rkapName,
            user.userId,
        );

        await db
            .update(items)
            .set({ name: parsed.data.name, rkapId: rkap.id })
            .where(eq(items.id, parsed.data.id));

        revalidatePath("/items-rkap");
        return { success: true, error: null };
    } catch (error) {
        console.error("[editItemRkapAction] Error:", error);
        return {
            success: false,
            error: "Terjadi kesalahan saat mengubah data.",
        };
    }
}

/* ══════════════════════════════════════════════
   Import Items & RKAP dari CSV
   ──────────────────────────────────────────────
   Format CSV:
   • rkap       : Nama RKAP
   • items      : Nama item (pisahkan beberapa item dengan ";")
   ══════════════════════════════════════════════ */

export type ImportResult =
    | { success: true; error: null; imported: number; skipped: number; errors: string[] }
    | { success: false; error: string; imported?: undefined; skipped?: undefined; errors?: string[] };

export async function importItemsRkapCsvAction(
    formData: FormData,
): Promise<ImportResult> {
    try {
        const user = await requirePermission("create");

        const file = formData.get("csv") as File | null;
        if (!file || file.size === 0) {
            return { success: false, error: "Tidak ada file CSV yang dipilih." };
        }

        // Validate type
        const validTypes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
        if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
            return { success: false, error: "File harus berformat CSV." };
        }

        // Max 2 MB for CSV
        if (file.size > 2 * 1024 * 1024) {
            return { success: false, error: "Ukuran CSV maksimal 2 MB." };
        }

        const text = await file.text();
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        if (lines.length < 2) {
            return { success: false, error: "CSV kosong atau hanya berisi header." };
        }

        // Auto-detect delimiter (semicolon or comma)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";

        // Parse header
        const header = firstLine.toLowerCase().split(delimiter).map((h) => h.trim());
        const requiredCols = ["rkap", "items"];
        const missing = requiredCols.filter((c) => !header.includes(c));
        if (missing.length > 0) {
            return {
                success: false,
                error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan header CSV sesuai template.`,
            };
        }

        const colIdx = Object.fromEntries(header.map((h, i) => [h, i]));

        // Parse data rows
        const rowErrors: string[] = [];
        const validRows: {
            rkapName: string;
            itemNames: string[];
        }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const rowNum = i + 1;
            const cols = parseCsvLine(lines[i], delimiter);

            if (cols.length < header.length) {
                rowErrors.push(`Baris ${rowNum}: Jumlah kolom tidak sesuai (${cols.length}/${header.length})`);
                continue;
            }

            const rawRkap = cols[colIdx.rkap].trim();
            const rawItems = cols[colIdx.items].trim();

            // Validate RKAP
            if (!rawRkap) {
                rowErrors.push(`Baris ${rowNum}: Nama RKAP wajib diisi.`);
                continue;
            }

            // Validate items — split by ";" for multiple items
            const itemNames = rawItems.split(";").map((n) => n.trim()).filter(Boolean);
            if (itemNames.length === 0) {
                rowErrors.push(`Baris ${rowNum}: Minimal satu item harus diisi.`);
                continue;
            }

            validRows.push({
                rkapName: rawRkap,
                itemNames,
            });
        }

        if (validRows.length === 0) {
            return {
                success: false,
                error: "Tidak ada data valid untuk diimport.",
                errors: rowErrors,
            };
        }

        // Insert in a single DB transaction
        let importedCount = 0;

        await db.transaction(async (trx) => {
            for (const row of validRows) {
                // Find or create RKAP
                const [rkap] = await trx
                    .insert(rkapNames)
                    .values({ name: row.rkapName, createdBy: user.userId })
                    .onConflictDoUpdate({
                        target: rkapNames.name,
                        set: { name: row.rkapName },
                    })
                    .returning();

                // Insert items (skip duplicates by checking existing)
                for (const itemName of row.itemNames) {
                    const existing = await trx
                        .select({ id: items.id })
                        .from(items)
                        .where(
                            sql`lower(${items.name}) = lower(${itemName}) AND ${items.rkapId} = ${rkap.id}`
                        )
                        .limit(1);

                    if (existing.length === 0) {
                        await trx.insert(items).values({
                            name: itemName,
                            rkapId: rkap.id,
                            createdBy: user.userId,
                        });
                        importedCount++;
                    } else {
                        rowErrors.push(`Item "${itemName}" (RKAP: ${row.rkapName}) sudah ada, dilewati.`);
                    }
                }
            }
        });

        revalidatePath("/items-rkap");

        return {
            success: true,
            error: null,
            imported: importedCount,
            skipped: rowErrors.length,
            errors: rowErrors,
        };
    } catch (error) {
        console.error("[importItemsRkapCsvAction] Error:", error);
        return { success: false, error: "Terjadi kesalahan saat mengimport data." };
    }
}

/* ── CSV line parser (handles quoted fields, supports comma or semicolon delimiter) ── */
function parseCsvLine(line: string, delimiter: string = ","): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === delimiter) {
                result.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}
