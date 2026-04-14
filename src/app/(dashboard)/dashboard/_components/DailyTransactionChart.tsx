"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { cn, formatRupiah } from "@/lib/utils";
import type { MonthTransaction } from "./DashboardClient";

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function isCashAdvanced(rkapName: string) {
    return rkapName.toLowerCase().trim() === "cash advanced";
}

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

type ActiveKey = "income" | "expense";
type TimeRange = "7d" | "30d" | "90d" | "all";

interface DailyData {
    date: string; // "yyyy-MM-dd"
    income: number;
    expense: number;
}

interface Props {
    filtered: MonthTransaction[];
}

/* ──────────────────────────────────────────────
   Chart config
   ────────────────────────────────────────────── */

const chartConfig = {
    income: { label: "Income", color: "#10b981" },
    expense: { label: "Expense", color: "#ef4444" },
} satisfies ChartConfig;

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Hari" },
    { value: "30d", label: "30 Hari" },
    { value: "90d", label: "90 Hari" },
    { value: "all", label: "Semua" },
];

/* ══════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════ */

export default function DailyTransactionChart({ filtered }: Props) {
    const [activeKey, setActiveKey] = useState<ActiveKey>("income");
    const [timeRange, setTimeRange] = useState<TimeRange>("all");

    /* ── Aggregate transactions by day ── */
    const allDailyData = useMemo<DailyData[]>(() => {
        const map = new Map<string, { income: number; expense: number }>();

        for (const tx of filtered) {
            if (isCashAdvanced(tx.rkapName)) continue;

            const day = format(new Date(tx.date), "yyyy-MM-dd");
            const prev = map.get(day) ?? { income: 0, expense: 0 };

            if (tx.type === "income") prev.income += tx.amount;
            else prev.expense += tx.amount;

            map.set(day, prev);
        }

        return Array.from(map.entries())
            .map(([date, vals]) => ({ date, ...vals }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [filtered]);

    /* ── Apply internal time-range filter ── */
    const chartData = useMemo<DailyData[]>(() => {
        if (timeRange === "all" || allDailyData.length === 0) return allDailyData;

        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const lastDate = new Date(allDailyData[allDailyData.length - 1].date);
        const cutoff = subDays(lastDate, days - 1);

        return allDailyData.filter((d) => new Date(d.date) >= cutoff);
    }, [allDailyData, timeRange]);

    /* ── Totals for header ── */
    const totals = useMemo(
        () => ({
            income: chartData.reduce((s, d) => s + d.income, 0),
            expense: chartData.reduce((s, d) => s + d.expense, 0),
        }),
        [chartData],
    );

    if (allDailyData.length === 0) return null;

    return (
        <Card>
            {/* ── Header ── */}
            <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Series toggles */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveKey("income")}
                        className={cn(
                            "flex flex-col items-start rounded-lg px-3 py-2 text-left transition-colors",
                            activeKey === "income"
                                ? "bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-800"
                                : "hover:bg-muted",
                        )}
                    >
                        <span className="text-[11px] text-muted-foreground">
                            Total Income
                        </span>
                        <span className="text-base font-bold tabular-nums text-emerald-600">
                            {formatRupiah(totals.income)}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveKey("expense")}
                        className={cn(
                            "flex flex-col items-start rounded-lg px-3 py-2 text-left transition-colors",
                            activeKey === "expense"
                                ? "bg-red-50 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800"
                                : "hover:bg-muted",
                        )}
                    >
                        <span className="text-[11px] text-muted-foreground">
                            Total Expense
                        </span>
                        <span className="text-base font-bold tabular-nums text-red-500">
                            {formatRupiah(totals.expense)}
                        </span>
                    </button>
                </div>

                {/* Time-range selector */}
                <div className="flex items-center gap-1">
                    {TIME_RANGE_OPTIONS.map((opt) => (
                        <Button
                            key={opt.value}
                            type="button"
                            variant={timeRange === opt.value ? "default" : "outline"}
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setTimeRange(opt.value)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
            </CardHeader>

            {/* ── Chart ── */}
            <CardContent className="px-2 pt-4 sm:px-6">
                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <AreaChart
                        data={chartData}
                        margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="#10b981"
                                    stopOpacity={0.35}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#10b981"
                                    stopOpacity={0.02}
                                />
                            </linearGradient>
                            <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="#ef4444"
                                    stopOpacity={0.35}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#ef4444"
                                    stopOpacity={0.02}
                                />
                            </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="3 3" />

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={40}
                            tickFormatter={(val: string) =>
                                format(new Date(val), "d MMM", { locale: idLocale })
                            }
                        />

                        <ChartTooltip
                            cursor={true}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(val: string) =>
                                        format(new Date(val), "EEEE, dd MMMM yyyy", {
                                            locale: idLocale,
                                        })
                                    }
                                    formatter={(value, name) => [
                                        formatRupiah(Number(value)),
                                        name === "income" ? "Income" : "Expense",
                                    ]}
                                    indicator="dot"
                                />
                            }
                        />

                        {/* Expense area — rendered below income */}
                        <Area
                            dataKey="expense"
                            type="monotone"
                            fill="url(#fillExpense)"
                            stroke="#ef4444"
                            strokeWidth={activeKey === "expense" ? 2 : 1.5}
                            strokeOpacity={activeKey === "expense" ? 1 : 0.35}
                            fillOpacity={activeKey === "expense" ? 1 : 0.4}
                        />

                        {/* Income area — rendered on top */}
                        <Area
                            dataKey="income"
                            type="monotone"
                            fill="url(#fillIncome)"
                            stroke="#10b981"
                            strokeWidth={activeKey === "income" ? 2 : 1.5}
                            strokeOpacity={activeKey === "income" ? 1 : 0.35}
                            fillOpacity={activeKey === "income" ? 1 : 0.4}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
