"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    Plus,
    Trash2,
    CalendarIcon,
    Search,
    X,
    Layers3,
    MoreHorizontal,
    Pencil,
    Trash,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, cn } from "@/lib/utils";
import type { BalanceRkapWithName } from "@/lib/balance-rkap/schemas";

import AddBalanceRkapDialog from "./AddBalanceRkapDialog";
import EditBalanceRkapDialog from "./EditBalanceRkapDialog";
import { deleteBalanceRkapAction } from "../actions";

/* ── Constants ── */
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

/* ── Props ── */
interface BalanceRkapClientProps {
    data: BalanceRkapWithName[];
    rkapOptions: { id: string; name: string }[];
}

export default function BalanceRkapClient({
    data,
    rkapOptions,
}: BalanceRkapClientProps) {
    /* ── State ── */
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
        new Set(),
    );
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dateFrom, setDateFrom] = React.useState<Date | undefined>();
    const [dateTo, setDateTo] = React.useState<Date | undefined>();
    const [addDialogOpen, setAddDialogOpen] = React.useState(false);
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] =
        React.useState<BalanceRkapWithName | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState<number>(10);

    /* ══════════════════════════════════════════════
       Filter by search + date range
       ══════════════════════════════════════════════ */
    const filteredData = React.useMemo(() => {
        return data.filter((item) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesRkap =
                    item.rkapName?.toLowerCase().includes(q) ?? false;
                const matchesBalance = formatRupiah(Number(item.balance))
                    .toLowerCase()
                    .includes(q);
                if (!matchesRkap && !matchesBalance) return false;
            }

            const itemDate = new Date(item.date);
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (itemDate < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (itemDate > to) return false;
            }
            return true;
        });
    }, [data, searchQuery, dateFrom, dateTo]);

    /* ══════════════════════════════════════════════
       Pagination
       ══════════════════════════════════════════════ */
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);

    const paginatedData = React.useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, safePage, pageSize]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, dateFrom, dateTo, pageSize]);

    /* ══════════════════════════════════════════════
       Totals
       ══════════════════════════════════════════════ */
    const totalBalance = React.useMemo(() => {
        return filteredData.reduce(
            (sum, item) => sum + Number(item.balance),
            0,
        );
    }, [filteredData]);

    /* Set of RKAP names that already have a balance record */
    const usedRkapNames = React.useMemo(() => {
        const names = new Set<string>();
        for (const item of data) {
            if (item.rkapName) names.add(item.rkapName);
        }
        return names;
    }, [data]);

    /* ══════════════════════════════════════════════
       Selection (scoped to current page)
       ══════════════════════════════════════════════ */
    const allPageSelected =
        paginatedData.length > 0 &&
        paginatedData.every((item) => selectedIds.has(item.id));

    const somePageSelected = paginatedData.some((item) =>
        selectedIds.has(item.id),
    );

    function toggleAll() {
        if (allPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const item of paginatedData) next.delete(item.id);
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const item of paginatedData) next.add(item.id);
                return next;
            });
        }
    }

    function toggleRow(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    /* ══════════════════════════════════════════════
       Delete handlers
       ══════════════════════════════════════════════ */
    async function handleBatchDelete() {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;

        setIsDeleting(true);
        const result = await deleteBalanceRkapAction(ids);
        setIsDeleting(false);

        if (result.success) {
            showToast.success(`${ids.length} data berhasil dihapus`);
            setSelectedIds(new Set());
        } else {
            showToast.error(result.error);
        }
    }

    async function handleSingleDelete(item: BalanceRkapWithName) {
        setIsDeleting(true);
        const result = await deleteBalanceRkapAction([item.id]);
        setIsDeleting(false);

        if (result.success) {
            showToast.success(
                `Saldo "${item.rkapName ?? "RKAP"}" berhasil dihapus`,
            );
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        } else {
            showToast.error(result.error);
        }
    }

    /* ── Edit ── */
    function handleEdit(item: BalanceRkapWithName) {
        setEditingItem(item);
        setEditDialogOpen(true);
    }

    /* ══════════════════════════════════════════════
       Filter helpers
       ══════════════════════════════════════════════ */
    function handleDateFromChange(date: Date | undefined) {
        setDateFrom(date);
        setSelectedIds(new Set());
    }

    function handleDateToChange(date: Date | undefined) {
        setDateTo(date);
        setSelectedIds(new Set());
    }

    function resetFilters() {
        setSearchQuery("");
        setDateFrom(undefined);
        setDateTo(undefined);
        setSelectedIds(new Set());
    }

    const hasActiveFilter = !!searchQuery || !!dateFrom || !!dateTo;

    /* ── Date formatters ── */
    function formatDate(date: Date | string, pattern = "dd MMM yyyy") {
        return format(new Date(date), pattern, { locale: localeId });
    }

    function formatDateTime(date: Date | string) {
        return format(new Date(date), "dd MMM yyyy, HH:mm", {
            locale: localeId,
        });
    }

    const startRow =
        filteredData.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endRow = Math.min(safePage * pageSize, filteredData.length);

    /* ══════════════════════════════════════════════
       Render
       ══════════════════════════════════════════════ */
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Layers3 className="size-4 text-muted-foreground" />
                                Daftar Saldo RKAP
                            </CardTitle>
                            <CardDescription>
                                {filteredData.length} data
                                {hasActiveFilter ? " (difilter)" : ""}
                                {selectedIds.size > 0 && (
                                    <>
                                        {" · "}
                                        <span className="font-medium text-foreground">
                                            {selectedIds.size} dipilih
                                        </span>
                                    </>
                                )}
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedIds.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={handleBatchDelete}
                                >
                                    <Trash2 className="size-4" />
                                    Hapus ({selectedIds.size})
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setAddDialogOpen(true)}
                            >
                                <Plus className="size-4" />
                                Tambah Saldo RKAP
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* ── Toolbar: Search + Date Filter ── */}
                <CardContent className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari RKAP atau saldo…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-9"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
                                >
                                    <X className="size-3 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        {/* Date filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !dateFrom &&
                                            "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="size-4" />
                                        {dateFrom
                                            ? formatDate(dateFrom)
                                            : "Dari tanggal"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={dateFrom}
                                        onSelect={handleDateFromChange}
                                    />
                                </PopoverContent>
                            </Popover>

                            <span className="text-xs text-muted-foreground">
                                —
                            </span>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !dateTo && "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="size-4" />
                                        {dateTo
                                            ? formatDate(dateTo)
                                            : "Sampai tanggal"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={dateTo}
                                        onSelect={handleDateToChange}
                                    />
                                </PopoverContent>
                            </Popover>

                            {hasActiveFilter && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="h-8 px-2"
                                >
                                    <X className="size-4" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Active filter badges */}
                    {hasActiveFilter && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Filter aktif:
                            </span>
                            {searchQuery && (
                                <Badge variant="secondary" className="gap-1">
                                    Pencarian: &quot;{searchQuery}&quot;
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="ml-0.5 rounded-full hover:bg-muted"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {dateFrom && (
                                <Badge variant="secondary" className="gap-1">
                                    Dari: {formatDate(dateFrom)}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDateFromChange(undefined)
                                        }
                                        className="ml-0.5 rounded-full hover:bg-muted"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {dateTo && (
                                <Badge variant="secondary" className="gap-1">
                                    Sampai: {formatDate(dateTo)}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDateToChange(undefined)
                                        }
                                        className="ml-0.5 rounded-full hover:bg-muted"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>

                {/* ── Table ── */}
                <CardContent className="pt-0">
                    <Table>
                        <TableCaption>
                            {filteredData.length > 0
                                ? `Menampilkan ${startRow}–${endRow} dari ${filteredData.length} data saldo RKAP.`
                                : "Belum ada data saldo RKAP."}
                        </TableCaption>

                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={
                                            allPageSelected
                                                ? true
                                                : somePageSelected
                                                    ? "indeterminate"
                                                    : false
                                        }
                                        onCheckedChange={toggleAll}
                                        aria-label="Pilih semua di halaman ini"
                                    />
                                </TableHead>
                                <TableHead className="w-14">No</TableHead>
                                <TableHead>Nama RKAP</TableHead>
                                <TableHead className="text-right">
                                    Saldo
                                </TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    Dibuat
                                </TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    Diperbarui
                                </TableHead>
                                <TableHead className="w-14 text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        {hasActiveFilter
                                            ? "Tidak ada data yang sesuai dengan filter."
                                            : "Belum ada data. Klik \"Tambah Saldo RKAP\" untuk memulai."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        data-state={
                                            selectedIds.has(item.id)
                                                ? "selected"
                                                : undefined
                                        }
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(
                                                    item.id,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleRow(item.id)
                                                }
                                                aria-label={`Pilih ${item.rkapName ?? "RKAP"}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {(safePage - 1) * pageSize +
                                                index +
                                                1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Badge variant="outline">
                                                {item.rkapName ?? "—"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">
                                            {formatRupiah(
                                                Number(item.balance),
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(
                                                item.date,
                                                "dd MMMM yyyy",
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                            {formatDateTime(item.createdAt)}
                                        </TableCell>
                                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                            {formatDateTime(item.updatedAt)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">
                                                            Menu aksi
                                                        </span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>
                                                        Aksi
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleEdit(item)
                                                        }
                                                    >
                                                        <Pencil className="size-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        disabled={isDeleting}
                                                        onClick={() =>
                                                            handleSingleDelete(
                                                                item,
                                                            )
                                                        }
                                                    >
                                                        <Trash className="size-4" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                        {/* ── Footer: totals ── */}
                        {filteredData.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="font-semibold"
                                    >
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-bold tabular-nums">
                                        {formatRupiah(totalBalance)}
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        className="text-right text-sm text-muted-foreground"
                                    >
                                        {filteredData.length} data
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>

                    {/* ── Pagination bar ── */}
                    {filteredData.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                {/* Rows per page */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Baris per halaman</span>
                                    <Select
                                        value={String(pageSize)}
                                        onValueChange={(v) =>
                                            setPageSize(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-17.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAGE_SIZE_OPTIONS.map((size) => (
                                                <SelectItem
                                                    key={size}
                                                    value={String(size)}
                                                >
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Page info + navigation */}
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        Halaman {safePage} dari {totalPages}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon-xs"
                                            disabled={safePage <= 1}
                                            onClick={() => setCurrentPage(1)}
                                            aria-label="Halaman pertama"
                                        >
                                            <ChevronsLeft className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-xs"
                                            disabled={safePage <= 1}
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                            aria-label="Halaman sebelumnya"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-xs"
                                            disabled={safePage >= totalPages}
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.min(
                                                        totalPages,
                                                        p + 1,
                                                    ),
                                                )
                                            }
                                            aria-label="Halaman berikutnya"
                                        >
                                            <ChevronRight className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-xs"
                                            disabled={safePage >= totalPages}
                                            onClick={() =>
                                                setCurrentPage(totalPages)
                                            }
                                            aria-label="Halaman terakhir"
                                        >
                                            <ChevronsRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Dialogs ── */}
            <AddBalanceRkapDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                rkapOptions={rkapOptions}
                usedRkapNames={usedRkapNames}
            />
            <EditBalanceRkapDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                item={editingItem}
                rkapOptions={rkapOptions}
                usedRkapNames={usedRkapNames}
            />
        </>
    );
}
