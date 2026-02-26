import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { transactions, transactionItems, items, rkapNames, balanceSheets } from "@/db/schema";
import TransactionsClient from "./_components/TransactionsClient";

/* ══════════════════════════════════════════════════════
   Metadata
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "Transactions — SISKEUKOM",
    description: "Kelola transaksi keuangan",
};

/* ══════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════ */

export default async function TransactionsPage() {
    /* Fetch transactions with RKAP name */
    const txRows = await db
        .select({
            id: transactions.id,
            date: transactions.date,
            rkapId: transactions.rkapId,
            rkapName: rkapNames.name,
            recipientName: transactions.recipientName,
            amount: transactions.amount,
            type: transactions.type,
            accountName: transactions.accountName,
            attachmentPath: transactions.attachmentPath,
            attachmentName: transactions.attachmentName,
            createdBy: transactions.createdBy,
            createdAt: transactions.createdAt,
            updatedAt: transactions.updatedAt,
        })
        .from(transactions)
        .leftJoin(rkapNames, eq(transactions.rkapId, rkapNames.id))
        .orderBy(desc(transactions.createdAt));

    /* Fetch all transaction items with item names */
    const allTxItems = await db
        .select({
            transactionId: transactionItems.transactionId,
            itemId: transactionItems.itemId,
            itemName: items.name,
        })
        .from(transactionItems)
        .leftJoin(items, eq(transactionItems.itemId, items.id));

    /* Merge items into transactions */
    const itemsByTxId = new Map<string, { id: string; name: string }[]>();
    for (const ti of allTxItems) {
        const list = itemsByTxId.get(ti.transactionId) ?? [];
        list.push({ id: ti.itemId, name: ti.itemName ?? "" });
        itemsByTxId.set(ti.transactionId, list);
    }

    const data = txRows.map((tx) => ({
        ...tx,
        items: itemsByTxId.get(tx.id) ?? [],
    }));

    /* Fetch all items with RKAP for the dialog multi-select */
    const allItems = await db
        .select({
            id: items.id,
            name: items.name,
            rkapId: items.rkapId,
            rkapName: rkapNames.name,
        })
        .from(items)
        .leftJoin(rkapNames, eq(items.rkapId, rkapNames.id))
        .orderBy(items.name);

    /* Fetch all balance sheets (Nama Akun) for the dialog dropdown */
    const allAccounts = await db
        .select({
            id: balanceSheets.id,
            name: balanceSheets.name,
            balance: balanceSheets.balance,
        })
        .from(balanceSheets)
        .orderBy(balanceSheets.name);

    return (
        <div className="space-y-8">
            {/* ── Page heading ── */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Transactions
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola transaksi keuangan komisaris
                </p>
            </div>

            {/* ── Main content ── */}
            <TransactionsClient
                data={data}
                itemOptions={allItems}
                accountOptions={allAccounts}
            />
        </div>
    );
}
