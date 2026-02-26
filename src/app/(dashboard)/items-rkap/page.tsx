import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { items, rkapNames } from "@/db/schema";
import ItemsRkapClient from "./_components/ItemsRkapClient";

/* ══════════════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Items & RKAP — SISKEUKOM",
    description: "Kelola item dan RKAP",
};

/* ══════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════ */

export default async function ItemsRkapPage() {
    /* Fetch items with RKAP name via join */
    const data = await db
        .select({
            id: items.id,
            name: items.name,
            rkapId: items.rkapId,
            rkapName: rkapNames.name,
            createdBy: items.createdBy,
            createdAt: items.createdAt,
            updatedAt: items.updatedAt,
        })
        .from(items)
        .leftJoin(rkapNames, eq(items.rkapId, rkapNames.id))
        .orderBy(desc(items.createdAt));

    /* Fetch all RKAP names for the combobox in dialogs */
    const allRkapNames = await db
        .select({ id: rkapNames.id, name: rkapNames.name })
        .from(rkapNames)
        .orderBy(rkapNames.name);

    /* Fetch all distinct item names for searchable item input */
    const allItemNames = await db
        .selectDistinct({ name: items.name })
        .from(items)
        .orderBy(items.name)
        .then((rows) => rows.map((r) => r.name));

    return (
        <div className="space-y-8">
            {/* ── Page heading ── */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Items & RKAP
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola daftar item dan nama RKAP
                </p>
            </div>

            {/* ── Main content ── */}
            <ItemsRkapClient
                data={data}
                rkapOptions={allRkapNames}
                itemOptions={allItemNames}
            />
        </div>
    );
}
