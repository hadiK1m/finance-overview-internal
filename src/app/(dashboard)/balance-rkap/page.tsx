import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { balanceRkap, rkapNames } from "@/db/schema";
import BalanceRkapClient from "./_components/BalanceRkapClient";

/* ══════════════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Saldo RKAP — SISKEUKOM",
    description: "Kelola saldo dari setiap data RKAP",
};

/* ══════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════ */

export default async function BalanceRkapPage() {
    /* Fetch balance RKAP with RKAP name via join */
    const data = await db
        .select({
            id: balanceRkap.id,
            rkapId: balanceRkap.rkapId,
            rkapName: rkapNames.name,
            balance: balanceRkap.balance,
            date: balanceRkap.date,
            createdBy: balanceRkap.createdBy,
            createdAt: balanceRkap.createdAt,
            updatedAt: balanceRkap.updatedAt,
        })
        .from(balanceRkap)
        .leftJoin(rkapNames, eq(balanceRkap.rkapId, rkapNames.id))
        .orderBy(desc(balanceRkap.createdAt));

    /* Fetch all RKAP names for the combobox in dialogs */
    const allRkapNames = await db
        .select({ id: rkapNames.id, name: rkapNames.name })
        .from(rkapNames)
        .orderBy(rkapNames.name);

    return (
        <div className="space-y-8">
            {/* ── Page heading ── */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Saldo RKAP
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola saldo dari setiap data RKAP
                </p>
            </div>

            {/* ── Main content ── */}
            <BalanceRkapClient data={data} rkapOptions={allRkapNames} />
        </div>
    );
}
