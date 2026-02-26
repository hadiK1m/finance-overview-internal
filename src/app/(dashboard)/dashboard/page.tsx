import type { Metadata } from "next";
import { desc, eq, and, gte, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { balanceSheets, transactions, rkapNames } from "@/db/schema";
import DashboardClient, {
    type DashboardData,
    type BalanceSheetOption,
    type MonthTransaction,
    type PrevMonthAggregate,
} from "./_components/DashboardClient";

/* ══════════════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Dashboard — SISKEUKOM",
    description: "Ringkasan keuangan dewan komisaris",
};

/* ══════════════════════════════════════════════════════
   Page Component (Server)
   ══════════════════════════════════════════════════════ */

export default async function DashboardPage() {
    const now = new Date();
    const currentMonth = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
    });

    /* ── Date boundaries ── */
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    /* ═══════════════════════════════════════════════════
       1. Balance Sheets — sorted newest first
       ═══════════════════════════════════════════════════ */
    const bsRows = await db
        .select({
            id: balanceSheets.id,
            name: balanceSheets.name,
            balance: balanceSheets.balance,
            date: balanceSheets.date,
        })
        .from(balanceSheets)
        .orderBy(desc(balanceSheets.date), desc(balanceSheets.createdAt));

    const balanceSheetOptions: BalanceSheetOption[] = bsRows.map((r) => ({
        id: r.id,
        name: r.name,
        balance: Number(r.balance),
        date: r.date.toISOString(),
    }));

    /* ═══════════════════════════════════════════════════
       2. ALL current-month transactions (client filters)
       ═══════════════════════════════════════════════════ */
    const txRows = await db
        .select({
            id: transactions.id,
            date: transactions.date,
            rkapName: rkapNames.name,
            recipientName: transactions.recipientName,
            amount: transactions.amount,
            type: transactions.type,
            accountName: transactions.accountName,
        })
        .from(transactions)
        .leftJoin(rkapNames, eq(transactions.rkapId, rkapNames.id))
        .where(
            and(
                gte(transactions.date, monthStart),
                lt(transactions.date, monthEnd),
            ),
        )
        .orderBy(desc(transactions.date), desc(transactions.createdAt));

    const currentMonthTransactions: MonthTransaction[] = txRows.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        rkapName: r.rkapName ?? "",
        recipientName: r.recipientName,
        amount: Number(r.amount),
        type: r.type,
        accountName: r.accountName,
    }));

    /* ═══════════════════════════════════════════════════
       3. Previous-month per-account aggregates (for trend)
       ═══════════════════════════════════════════════════ */
    const prevRows = await db
        .select({
            accountName: transactions.accountName,
            type: transactions.type,
            rkapLower: sql<string>`LOWER(TRIM(${rkapNames.name}))`.as(
                "rkap_lower",
            ),
            total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(rkapNames, eq(transactions.rkapId, rkapNames.id))
        .where(
            and(
                gte(transactions.date, prevMonthStart),
                lt(transactions.date, prevMonthEnd),
            ),
        )
        .groupBy(
            transactions.accountName,
            transactions.type,
            sql`LOWER(TRIM(${rkapNames.name}))`,
        );

    // Build per-account aggregates (excluding Cash Advanced from income/expense)
    const aggregateMap = new Map<
        string,
        { income: number; expense: number }
    >();
    for (const row of prevRows) {
        const isCashAdvanced = row.rkapLower === "cash advanced";
        if (isCashAdvanced) continue;

        const existing = aggregateMap.get(row.accountName) ?? {
            income: 0,
            expense: 0,
        };
        if (row.type === "income") {
            existing.income += Number(row.total);
        } else {
            existing.expense += Number(row.total);
        }
        aggregateMap.set(row.accountName, existing);
    }

    const prevMonthAggregates: PrevMonthAggregate[] = Array.from(
        aggregateMap.entries(),
    ).map(([accountName, agg]) => ({
        accountName,
        income: agg.income,
        expense: agg.expense,
    }));

    /* ═══════════════════════════════════════════════════
       4. Assemble & render
       ═══════════════════════════════════════════════════ */
    const dashboardData: DashboardData = {
        balanceSheets: balanceSheetOptions,
        currentMonthTransactions,
        prevMonthAggregates,
        currentMonth,
    };

    return <DashboardClient data={dashboardData} />;
}
