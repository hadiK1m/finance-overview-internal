import type { Metadata } from "next";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { balanceSheets } from "@/db/schema";
import CashBalanceClient from "./_components/CashBalanceClient";

/* ══════════════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Saldo & Neraca — SISKEUKOM",
    description: "Kelola saldo dan neraca dari setiap sumber dana",
};

/* ══════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════ */

export default async function CashBalancePage() {
    const data = await db
        .select()
        .from(balanceSheets)
        .orderBy(desc(balanceSheets.createdAt));

    return (
        <div className="space-y-8">
            {/* ── Page heading ── */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Saldo & Neraca
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola saldo dari setiap sumber dana
                </p>
            </div>

            {/* ── Main content ── */}
            <CashBalanceClient data={data} />
        </div>
    );
}
