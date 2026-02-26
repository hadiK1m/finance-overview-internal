"use client";

import { useState, useMemo } from "react";
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    ArrowLeftRight,
    TrendingUp,
    TrendingDown,
    Plus,
    Layers3,
    FileBarChart,
    Receipt,
    CalendarDays,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn, formatRupiah } from "@/lib/utils";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface BalanceSheetOption {
    id: string;
    name: string;
    balance: number;
    date: string; // ISO string
}

export interface MonthTransaction {
    id: string;
    date: string; // ISO string
    rkapName: string;
    recipientName: string;
    amount: number;
    type: string;
    accountName: string;
}

export interface PrevMonthAggregate {
    accountName: string;
    income: number;
    expense: number;
}

export interface DashboardData {
    /** All balance sheet records (sorted newest first) */
    balanceSheets: BalanceSheetOption[];
    /** ALL transactions for current month — client filters by selected account */
    currentMonthTransactions: MonthTransaction[];
    /** Previous month income/expense per account (excluding Cash Advanced) */
    prevMonthAggregates: PrevMonthAggregate[];
    /** Current month label e.g. "Februari 2026" */
    currentMonth: string;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function isCashAdvanced(rkapName: string): boolean {
    return rkapName.toLowerCase().trim() === "cash advanced";
}

function trendPct(current: number, previous: number): string | null {
    if (previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% dari bulan lalu`;
}

/* ══════════════════════════════════════════════
   Client Component
   ══════════════════════════════════════════════ */

export default function DashboardClient({ data }: { data: DashboardData }) {
    const {
        balanceSheets: bsOptions,
        currentMonthTransactions,
        prevMonthAggregates,
        currentMonth,
    } = data;

    // Default to most recent balance sheet (first in array)
    const [selectedBsId, setSelectedBsId] = useState(
        bsOptions[0]?.id ?? "",
    );

    const selectedBs = useMemo(
        () => bsOptions.find((bs) => bs.id === selectedBsId),
        [bsOptions, selectedBsId],
    );
    const totalBalance = selectedBs?.balance ?? 0;

    /* ── Filter transactions by selected account ── */
    const filtered = useMemo(() => {
        if (!selectedBs) return currentMonthTransactions;
        return currentMonthTransactions.filter(
            (tx) => tx.accountName === selectedBs.name,
        );
    }, [selectedBs, currentMonthTransactions]);

    /* ── Compute aggregates from filtered transactions ── */
    const { incomeMTD, expenseMTD, cashAdvancedTotal } = useMemo(() => {
        let income = 0;
        let expense = 0;
        let cashAdv = 0;

        for (const tx of filtered) {
            if (isCashAdvanced(tx.rkapName)) {
                if (tx.type === "income") cashAdv += tx.amount;
                continue; // exclude from income/expense
            }
            if (tx.type === "income") income += tx.amount;
            else expense += tx.amount;
        }

        return { incomeMTD: income, expenseMTD: expense, cashAdvancedTotal: cashAdv };
    }, [filtered]);

    /* ── Recent 7 transactions from filtered set ── */
    const recentTransactions = useMemo(() => filtered.slice(0, 7), [filtered]);

    /* ── Previous month trend for selected account ── */
    const prevAgg = useMemo(() => {
        if (!selectedBs) return { income: 0, expense: 0 };
        return (
            prevMonthAggregates.find(
                (a) => a.accountName === selectedBs.name,
            ) ?? { income: 0, expense: 0 }
        );
    }, [selectedBs, prevMonthAggregates]);

    const incomeTrend = trendPct(incomeMTD, prevAgg.income);
    const expenseTrend = trendPct(expenseMTD, prevAgg.expense);

    /* ── Summary cards ── */
    const summaryCards = [
        {
            title: "Total Balance",
            value: totalBalance,
            icon: Wallet,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-50",
            trend: selectedBs
                ? `Akun: ${selectedBs.name}`
                : "Tidak ada data",
        },
        {
            title: "Income (MTD)",
            value: incomeMTD,
            icon: ArrowUpRight,
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50",
            trend: incomeTrend,
            trendUp: incomeMTD >= prevAgg.income,
        },
        {
            title: "Expense (MTD)",
            value: expenseMTD,
            icon: ArrowDownRight,
            iconColor: "text-red-500",
            iconBg: "bg-red-50",
            trend: expenseTrend,
            trendUp: expenseMTD <= prevAgg.expense, // less expense = good
        },
        {
            title: "Pemindahan Saldo Antar Akun",
            value: cashAdvancedTotal,
            icon: ArrowLeftRight,
            iconColor: "text-violet-600",
            iconBg: "bg-violet-50",
            trend: "Total Cash Advanced (non-expense)",
        },
    ];

    return (
        <div className="space-y-8">
            {/* ── Page heading ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Dashboard Overview
                        </h1>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            Live
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Ringkasan keuangan per {currentMonth}
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    <span>Updated just now</span>
                </div>
            </div>

            {/* ── Balance Sheet selector ── */}
            {bsOptions.length > 0 && (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                        Sumber Dana (Neraca):
                    </span>
                    <Select
                        value={selectedBsId}
                        onValueChange={setSelectedBsId}
                    >
                        <SelectTrigger className="w-72">
                            <SelectValue placeholder="Pilih neraca…" />
                        </SelectTrigger>
                        <SelectContent>
                            {bsOptions.map((bs) => (
                                <SelectItem key={bs.id} value={bs.id}>
                                    {bs.name} —{" "}
                                    {new Date(bs.date).toLocaleDateString(
                                        "id-ID",
                                        {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        },
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* ── Summary cards grid ── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <Card key={card.title} className="gap-4 py-5">
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between">
                                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                                    {card.title}
                                </CardDescription>
                                <div
                                    className={cn(
                                        "flex size-9 items-center justify-center rounded-lg",
                                        card.iconBg,
                                    )}
                                >
                                    <card.icon
                                        className={cn(
                                            "size-4",
                                            card.iconColor,
                                        )}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-2xl font-bold tracking-tight">
                                {formatRupiah(card.value)}
                            </p>
                            {card.trend && (
                                <p
                                    className={cn(
                                        "mt-1 flex items-center gap-1 text-xs",
                                        card.trendUp === true
                                            ? "text-emerald-600"
                                            : card.trendUp === false
                                                ? "text-red-500"
                                                : "text-muted-foreground",
                                    )}
                                >
                                    {card.trendUp === true && (
                                        <TrendingUp className="size-3" />
                                    )}
                                    {card.trendUp === false && (
                                        <TrendingDown className="size-3" />
                                    )}
                                    {card.trend}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Content grid: Transactions + Quick Actions ── */}
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                {/* Recent Transactions */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Receipt className="size-4 text-muted-foreground" />
                                    Transaksi Terbaru
                                </CardTitle>
                                <CardDescription>
                                    {recentTransactions.length} transaksi
                                    terakhir bulan ini
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href="/transactions">Lihat Semua</a>
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {recentTransactions.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Belum ada transaksi bulan ini.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-25">
                                            Tanggal
                                        </TableHead>
                                        <TableHead>Deskripsi</TableHead>
                                        <TableHead className="hidden sm:table-cell">
                                            RKAP
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Jumlah
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTransactions.map((txn) => {
                                        const isCa = isCashAdvanced(
                                            txn.rkapName,
                                        );
                                        let colorClass =
                                            "text-muted-foreground";
                                        let prefix = "";
                                        if (isCa) {
                                            colorClass = "text-violet-600";
                                            prefix = "⇄ ";
                                        } else if (txn.type === "income") {
                                            colorClass = "text-emerald-600";
                                            prefix = "+";
                                        } else {
                                            colorClass = "text-red-500";
                                            prefix = "−";
                                        }

                                        return (
                                            <TableRow key={txn.id}>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        txn.date,
                                                    ).toLocaleDateString(
                                                        "id-ID",
                                                        {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {txn.recipientName}
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <Badge
                                                        variant={
                                                            isCa
                                                                ? "outline"
                                                                : "secondary"
                                                        }
                                                        className={cn(
                                                            "text-xs font-normal",
                                                            isCa &&
                                                            "border-violet-300 text-violet-600",
                                                        )}
                                                    >
                                                        {txn.rkapName}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        "text-right font-semibold tabular-nums",
                                                        colorClass,
                                                    )}
                                                >
                                                    {prefix}
                                                    {formatRupiah(txn.amount)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Quick Actions
                            </CardTitle>
                            <CardDescription>
                                Aksi cepat yang sering digunakan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <a href="/transactions">
                                    <Plus className="size-4" />
                                    Add Transaction
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <a href="/items-rkap">
                                    <Layers3 className="size-4" />
                                    Kelola Items & RKAP
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                asChild
                            >
                                <a href="/cash-balance">
                                    <FileBarChart className="size-4" />
                                    Saldo & Neraca
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Budget overview mini card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Budget Bulan Ini
                            </CardTitle>
                            <CardDescription>
                                Pemakaian anggaran {currentMonth}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Terpakai
                                    </span>
                                    <span className="font-semibold">
                                        {incomeMTD > 0
                                            ? Math.round(
                                                (expenseMTD / incomeMTD) *
                                                100,
                                            )
                                            : 0}
                                        %
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-blue-600 transition-all"
                                        style={{
                                            width: `${incomeMTD > 0
                                                ? Math.min(
                                                    (expenseMTD /
                                                        incomeMTD) *
                                                    100,
                                                    100,
                                                )
                                                : 0
                                                }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {formatRupiah(incomeMTD)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Income
                                    </p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-red-500">
                                        {formatRupiah(expenseMTD)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Expense
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
