/* eslint-disable react-hooks/incompatible-library */
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
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    type SortingState,
    type ColumnDef,
} from "@tanstack/react-table";

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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatRupiah } from "@/lib/utils";
import DailyTransactionChart from "./DailyTransactionChart";

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
    /** ALL transactions for current year — client filters by date range + account */
    allTransactions: MonthTransaction[];
    /** Previous month income/expense per account (excluding Cash Advanced) */
    prevMonthAggregates: PrevMonthAggregate[];
    /** Current month label e.g. "Februari 2026" */
    currentMonth: string;
    /** Current year number e.g. 2026 */
    currentYear: number;
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
    "use no memo";
    const {
        balanceSheets: bsOptions,
        allTransactions,
        prevMonthAggregates,
        currentMonth,
        currentYear,
    } = data;

    // Default to most recent balance sheet (first in array)
    const [selectedBsId, setSelectedBsId] = useState(
        bsOptions[0]?.id ?? "",
    );

    // Date range filter — defaults to start of year → end of year
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(currentYear, 0, 1),
        to: new Date(currentYear, 11, 31),
    });

    // Table sorting state
    const [sorting, setSorting] = useState<SortingState>([]);

    const selectedBs = useMemo(
        () => bsOptions.find((bs) => bs.id === selectedBsId),
        [bsOptions, selectedBsId],
    );
    const totalBalance = selectedBs?.balance ?? 0;

    /* ── Filter transactions by selected account + date range ── */
    const filtered = useMemo(() => {
        let result = allTransactions;

        // Filter by selected account (case-insensitive to handle legacy data)
        if (selectedBs) {
            const accountLower = selectedBs.name.toLowerCase();
            result = result.filter(
                (tx) => tx.accountName.toLowerCase() === accountLower,
            );
        }

        // Filter by date range
        if (dateRange?.from) {
            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            result = result.filter((tx) => new Date(tx.date) >= from);
        }
        if (dateRange?.to) {
            const to = new Date(dateRange.to);
            to.setHours(23, 59, 59, 999);
            result = result.filter((tx) => new Date(tx.date) <= to);
        }

        return result;
    }, [selectedBs, allTransactions, dateRange]);

    /* ── Compute aggregates from filtered transactions ── */
    const { incomeMTD, expenseMTD, cashAdvancedIn, cashAdvancedOut } = useMemo(() => {
        let income = 0;
        let expense = 0;
        let caIn = 0;
        let caOut = 0;

        for (const tx of filtered) {
            if (isCashAdvanced(tx.rkapName)) {
                if (tx.type === "income") caIn += tx.amount;
                else caOut += tx.amount;
                continue;
            }
            if (tx.type === "income") income += tx.amount;
            else expense += tx.amount;
        }

        // Tambahkan saldo dari balance sheets yang namanya sesuai akun terpilih
        // dan tanggalnya masuk dalam date range yang dipilih.
        if (selectedBs) {
            const accountLower = selectedBs.name.toLowerCase();
            for (const bs of bsOptions) {
                if (bs.name.toLowerCase() !== accountLower) continue;

                const bsDate = new Date(bs.date);
                if (dateRange?.from) {
                    const from = new Date(dateRange.from);
                    from.setHours(0, 0, 0, 0);
                    if (bsDate < from) continue;
                }
                if (dateRange?.to) {
                    const to = new Date(dateRange.to);
                    to.setHours(23, 59, 59, 999);
                    if (bsDate > to) continue;
                }

                income += bs.balance;
            }
        }

        return { incomeMTD: income, expenseMTD: expense, cashAdvancedIn: caIn, cashAdvancedOut: caOut };
    }, [filtered, selectedBs, bsOptions, dateRange]);

    /* ── Previous month trend for selected account ── */
    const prevAgg = useMemo(() => {
        if (!selectedBs) return { income: 0, expense: 0 };
        const accountLower = selectedBs.name.toLowerCase();
        return (
            prevMonthAggregates.find(
                (a) => a.accountName.toLowerCase() === accountLower,
            ) ?? { income: 0, expense: 0 }
        );
    }, [selectedBs, prevMonthAggregates]);

    const incomeTrend = trendPct(incomeMTD, prevAgg.income);
    const expenseTrend = trendPct(expenseMTD, prevAgg.expense);

    /* ── Human-readable date range label ── */
    const dateRangeLabel = useMemo(() => {
        if (!dateRange?.from) return "Semua Periode";
        const from = format(dateRange.from, "d MMM", { locale: idLocale });
        if (!dateRange.to) return `Sejak ${from}`;
        const to = format(dateRange.to, "d MMM yyyy", { locale: idLocale });
        // Check if range covers exactly Jan 1 – Dec 31 of the same year
        const f = dateRange.from;
        const t = dateRange.to;
        if (
            f.getMonth() === 0 &&
            f.getDate() === 1 &&
            t.getMonth() === 11 &&
            t.getDate() === 31 &&
            f.getFullYear() === t.getFullYear()
        ) {
            return `Tahun ${f.getFullYear()}`;
        }
        return `${from} – ${to}`;
    }, [dateRange]);

    /* ── Table column definitions ── */
    const columns = useMemo<ColumnDef<MonthTransaction>[]>(
        () => [
            {
                accessorKey: "date",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 font-medium"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Tanggal
                        {column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1 size-3.5" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1 size-3.5" />
                        ) : (
                            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/50" />
                        )}
                    </Button>
                ),
                cell: ({ row }) =>
                    new Date(row.getValue("date")).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    }),
                sortingFn: (a, b) =>
                    new Date(a.getValue("date")).getTime() -
                    new Date(b.getValue("date")).getTime(),
                meta: { className: "w-[100px] shrink-0" },
            },
            {
                accessorKey: "recipientName",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 font-medium"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Deskripsi
                        {column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1 size-3.5" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1 size-3.5" />
                        ) : (
                            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/50" />
                        )}
                    </Button>
                ),
                cell: ({ row }) => {
                    const name: string = row.getValue("recipientName");
                    return (
                        <div
                            className="max-w-px truncate font-medium"
                            title={name}
                        >
                            {name}
                        </div>
                    );
                },
                meta: { className: "w-full min-w-0" },
            },
            {
                accessorKey: "rkapName",
                header: "RKAP",
                cell: ({ row }) => {
                    const name: string = row.getValue("rkapName");
                    const isCa = isCashAdvanced(name);
                    return (
                        <Badge
                            variant={isCa ? "outline" : "secondary"}
                            className={cn(
                                "max-w-30 truncate text-xs font-normal",
                                isCa && "border-sky-300 text-sky-600",
                            )}
                            title={name}
                        >
                            {name}
                        </Badge>
                    );
                },
                meta: { className: "hidden sm:table-cell w-[140px] shrink-0" },
            },
            {
                accessorKey: "amount",
                header: ({ column }) => (
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-mr-3 h-8 font-medium"
                            onClick={() =>
                                column.toggleSorting(
                                    column.getIsSorted() === "asc",
                                )
                            }
                        >
                            Jumlah
                            {column.getIsSorted() === "asc" ? (
                                <ArrowUp className="ml-1 size-3.5" />
                            ) : column.getIsSorted() === "desc" ? (
                                <ArrowDown className="ml-1 size-3.5" />
                            ) : (
                                <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/50" />
                            )}
                        </Button>
                    </div>
                ),
                cell: ({ row }) => {
                    const txn = row.original;
                    const isCa = isCashAdvanced(txn.rkapName);
                    let colorClass = "text-muted-foreground";
                    let prefix = "";
                    if (isCa) {
                        colorClass = "text-sky-600";
                        prefix = "⇄ ";
                    } else if (txn.type === "income") {
                        colorClass = "text-emerald-600";
                        prefix = "+";
                    } else {
                        colorClass = "text-red-500";
                        prefix = "−";
                    }
                    return (
                        <div
                            className={cn(
                                "text-right font-semibold tabular-nums",
                                colorClass,
                            )}
                        >
                            {prefix}
                            {formatRupiah(txn.amount)}
                        </div>
                    );
                },
                sortingFn: (a, b) =>
                    Number(a.getValue("amount")) - Number(b.getValue("amount")),
                meta: { className: "w-[140px] shrink-0 text-right" },
            },
        ],
        [],
    );

    /* ── React Table instance ── */
    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: 10 },
        },
    });

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
            title: `Income (${dateRangeLabel})`,
            value: incomeMTD,
            icon: ArrowUpRight,
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50",
            trend: incomeTrend,
            trendUp: incomeMTD >= prevAgg.income,
        },
        {
            title: `Expense (${dateRangeLabel})`,
            value: expenseMTD,
            icon: ArrowDownRight,
            iconColor: "text-red-500",
            iconBg: "bg-red-50",
            trend: expenseTrend,
            trendUp: expenseMTD <= prevAgg.expense,
        },
        {
            title: "Pemindahan Saldo Antar Akun",
            value: cashAdvancedIn + cashAdvancedOut,
            icon: ArrowLeftRight,
            iconColor: "text-sky-600",
            iconBg: "bg-sky-50",
            trend: `Masuk ${formatRupiah(cashAdvancedIn)} · Keluar ${formatRupiah(cashAdvancedOut)}`,
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

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 gap-2 text-xs font-normal",
                                !dateRange && "text-muted-foreground",
                            )}
                        >
                            <CalendarDays className="size-3.5" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "d MMM", {
                                            locale: idLocale,
                                        })}
                                        {" – "}
                                        {format(dateRange.to, "d MMM yyyy", {
                                            locale: idLocale,
                                        })}
                                    </>
                                ) : (
                                    format(dateRange.from, "d MMM yyyy", {
                                        locale: idLocale,
                                    })
                                )
                            ) : (
                                "Filter Tanggal"
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="range"
                            defaultMonth={dateRange?.from ?? new Date()}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            locale={idLocale}
                        />
                        {dateRange?.from && (
                            <div className="border-t px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => setDateRange(undefined)}
                                >
                                    Reset Filter
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
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

            {/* ── Daily Transaction Chart ── */}
            <DailyTransactionChart filtered={filtered} />

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
                                    {filtered.length} transaksi ditemukan
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href="/transactions">Lihat Semua</a>
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {filtered.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Belum ada transaksi pada rentang tanggal ini.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-md border overflow-hidden">
                                    <Table className="table-fixed w-full">
                                        <TableHeader>
                                            {table
                                                .getHeaderGroups()
                                                .map((headerGroup) => (
                                                    <TableRow
                                                        key={headerGroup.id}
                                                    >
                                                        {headerGroup.headers.map(
                                                            (header) => (
                                                                <TableHead
                                                                    key={
                                                                        header.id
                                                                    }
                                                                    className={cn(
                                                                        (
                                                                            header
                                                                                .column
                                                                                .columnDef
                                                                                .meta as {
                                                                                    className?: string;
                                                                                }
                                                                        )
                                                                            ?.className,
                                                                    )}
                                                                >
                                                                    {header.isPlaceholder
                                                                        ? null
                                                                        : flexRender(
                                                                            header
                                                                                .column
                                                                                .columnDef
                                                                                .header,
                                                                            header.getContext(),
                                                                        )}
                                                                </TableHead>
                                                            ),
                                                        )}
                                                    </TableRow>
                                                ))}
                                        </TableHeader>
                                        <TableBody>
                                            {table
                                                .getRowModel()
                                                .rows.map((row) => (
                                                    <TableRow key={row.id}>
                                                        {row
                                                            .getVisibleCells()
                                                            .map((cell) => (
                                                                <TableCell
                                                                    key={
                                                                        cell.id
                                                                    }
                                                                    className={cn(
                                                                        (
                                                                            cell
                                                                                .column
                                                                                .columnDef
                                                                                .meta as {
                                                                                    className?: string;
                                                                                }
                                                                        )
                                                                            ?.className,
                                                                    )}
                                                                >
                                                                    {flexRender(
                                                                        cell
                                                                            .column
                                                                            .columnDef
                                                                            .cell,
                                                                        cell.getContext(),
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination controls */}
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-xs text-muted-foreground">
                                        Halaman{" "}
                                        {table.getState().pagination
                                            .pageIndex + 1}{" "}
                                        dari {table.getPageCount()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-8"
                                                onClick={() =>
                                                    table.setPageIndex(0)
                                                }
                                                disabled={
                                                    !table.getCanPreviousPage()
                                                }
                                            >
                                                <ChevronsLeft className="size-4" />
                                                <span className="sr-only">
                                                    First
                                                </span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-8"
                                                onClick={() =>
                                                    table.previousPage()
                                                }
                                                disabled={
                                                    !table.getCanPreviousPage()
                                                }
                                            >
                                                <ChevronLeft className="size-4" />
                                                <span className="sr-only">
                                                    Previous
                                                </span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-8"
                                                onClick={() =>
                                                    table.nextPage()
                                                }
                                                disabled={
                                                    !table.getCanNextPage()
                                                }
                                            >
                                                <ChevronRight className="size-4" />
                                                <span className="sr-only">
                                                    Next
                                                </span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-8"
                                                onClick={() =>
                                                    table.setPageIndex(
                                                        table.getPageCount() -
                                                        1,
                                                    )
                                                }
                                                disabled={
                                                    !table.getCanNextPage()
                                                }
                                            >
                                                <ChevronsRight className="size-4" />
                                                <span className="sr-only">
                                                    Last
                                                </span>
                                            </Button>
                                        </div>
                                        <Select
                                            value={String(
                                                table.getState().pagination
                                                    .pageSize,
                                            )}
                                            onValueChange={(val) =>
                                                table.setPageSize(Number(val))
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-17.5">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[5, 10, 20, 50].map(
                                                    (size) => (
                                                        <SelectItem
                                                            key={size}
                                                            value={String(size)}
                                                        >
                                                            {size}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
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
                                Ringkasan Anggaran
                            </CardTitle>
                            <CardDescription>
                                Pemakaian anggaran {dateRangeLabel}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
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
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-emerald-600" title={formatRupiah(incomeMTD)}>
                                        {formatRupiah(incomeMTD)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Income
                                    </p>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-red-500" title={formatRupiah(expenseMTD)}>
                                        {formatRupiah(expenseMTD)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
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
