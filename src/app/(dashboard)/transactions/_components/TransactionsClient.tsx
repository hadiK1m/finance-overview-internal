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
    ArrowLeftRight,
    MoreHorizontal,
    Pencil,
    Trash,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    Download,
    Upload,
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
import type {
    TransactionWithDetails,
    ItemOption,
    AccountOption,
} from "@/lib/transactions/schemas";

import AddTransactionDialog from "./AddTransactionDialog";
import EditTransactionDialog from "./EditTransactionDialog";
import ImportCsvDialog from "./ImportCsvDialog";
import { deleteTransactionsAction } from "../actions";

/* ── Constants ── */
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

/* ── Props ── */
interface TransactionsClientProps {
    data: TransactionWithDetails[];
    itemOptions: ItemOption[];
    accountOptions: AccountOption[];
}

export default function TransactionsClient({
    data,
    itemOptions,
    accountOptions,
}: TransactionsClientProps) {
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
        React.useState<TransactionWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState<number>(10);
    const [importDialogOpen, setImportDialogOpen] = React.useState(false);

    /* ══════════════════════════════════════════════
       Filter
       ══════════════════════════════════════════════ */
    const filteredData = React.useMemo(() => {
        return data.filter((tx) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesRkap =
                    tx.rkapName?.toLowerCase().includes(q) ?? false;
                const matchesRecipient = tx.recipientName
                    .toLowerCase()
                    .includes(q);
                const matchesAccount = tx.accountName
                    .toLowerCase()
                    .includes(q);
                const matchesItems = tx.items.some((i) =>
                    i.name.toLowerCase().includes(q),
                );
                const matchesAmount = formatRupiah(Number(tx.amount))
                    .toLowerCase()
                    .includes(q);
                if (
                    !matchesRkap &&
                    !matchesRecipient &&
                    !matchesAccount &&
                    !matchesItems &&
                    !matchesAmount
                )
                    return false;
            }

            const txDate = new Date(tx.date);
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (txDate < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (txDate > to) return false;
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

    /* ── Totals ── */
    const totalAmount = React.useMemo(() => {
        return filteredData.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0,
        );
    }, [filteredData]);

    /* ══════════════════════════════════════════════
       Selection
       ══════════════════════════════════════════════ */
    const allPageSelected =
        paginatedData.length > 0 &&
        paginatedData.every((tx) => selectedIds.has(tx.id));

    const somePageSelected = paginatedData.some((tx) =>
        selectedIds.has(tx.id),
    );

    function toggleAll() {
        if (allPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const tx of paginatedData) next.delete(tx.id);
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const tx of paginatedData) next.add(tx.id);
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
       Delete
       ══════════════════════════════════════════════ */
    async function handleBatchDelete() {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        setIsDeleting(true);
        const result = await deleteTransactionsAction(ids);
        setIsDeleting(false);
        if (result.success) {
            showToast.success(`${ids.length} transaksi berhasil dihapus`);
            setSelectedIds(new Set());
        } else {
            showToast.error(result.error);
        }
    }

    async function handleSingleDelete(tx: TransactionWithDetails) {
        setIsDeleting(true);
        const result = await deleteTransactionsAction([tx.id]);
        setIsDeleting(false);
        if (result.success) {
            showToast.success("Transaksi berhasil dihapus");
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(tx.id);
                return next;
            });
        } else {
            showToast.error(result.error);
        }
    }

    /* ── Download Template CSV ── */
    function handleDownloadTemplate() {
        const headers = "tanggal,rkap,items,penerima,jumlah,tipe,sumber_dana";
        const example =
            '01/01/2025,Nama RKAP,"Item A;Item B",Nama Penerima,1500000,pengeluaran,Nama Rekening';
        const csv = `${headers}\n${example}\n`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "template_transaksi.csv";
        link.click();
        URL.revokeObjectURL(url);
    }

    /* ── Edit ── */
    function handleEdit(tx: TransactionWithDetails) {
        setEditingItem(tx);
        setEditDialogOpen(true);
    }

    /* ── Filter helpers ── */
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

    /* ── Formatters ── */
    function formatDate(date: Date | string, pattern = "dd MMM yyyy") {
        return format(new Date(date), pattern, { locale: localeId });
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
                                <ArrowLeftRight className="size-4 text-muted-foreground" />
                                Daftar Transaksi
                            </CardTitle>
                            <CardDescription>
                                {filteredData.length} transaksi
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

                        <div className="flex flex-wrap items-center gap-2">
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
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadTemplate}
                            >
                                <Download className="size-4" />
                                Template CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImportDialogOpen(true)}
                            >
                                <Upload className="size-4" />
                                Import CSV
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setAddDialogOpen(true)}
                            >
                                <Plus className="size-4" />
                                Buat Transaksi
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* ── Toolbar ── */}
                <CardContent className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari transaksi…"
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

                    {/* Filter badges */}
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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableCaption>
                                {filteredData.length > 0
                                    ? `Menampilkan ${startRow}–${endRow} dari ${filteredData.length} transaksi.`
                                    : "Belum ada data transaksi."}
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
                                            aria-label="Pilih semua"
                                        />
                                    </TableHead>
                                    <TableHead className="w-14">No</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Nama RKAP</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Penerima Uang</TableHead>
                                    <TableHead className="text-right">
                                        Jumlah
                                    </TableHead>
                                    <TableHead>Nama Akun</TableHead>
                                    <TableHead>Lampiran</TableHead>
                                    <TableHead className="w-14 text-center">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            {hasActiveFilter
                                                ? "Tidak ada transaksi yang sesuai filter."
                                                : "Belum ada transaksi. Klik \"Buat Transaksi\" untuk memulai."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((tx, index) => (
                                        <TableRow
                                            key={tx.id}
                                            data-state={
                                                selectedIds.has(tx.id)
                                                    ? "selected"
                                                    : undefined
                                            }
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(
                                                        tx.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleRow(tx.id)
                                                    }
                                                    aria-label={`Pilih transaksi`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {(safePage - 1) * pageSize +
                                                    index +
                                                    1}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {formatDate(
                                                    tx.date,
                                                    "dd MMMM yyyy",
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {tx.rkapName ?? "—"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {tx.items.length > 0
                                                        ? tx.items.map((i) => (
                                                            <Badge
                                                                key={i.id}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {i.name}
                                                            </Badge>
                                                        ))
                                                        : "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {tx.recipientName}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                                                <span
                                                    className={
                                                        tx.type === "income"
                                                            ? "text-emerald-600"
                                                            : "text-red-600"
                                                    }
                                                >
                                                    {tx.type === "income" ? "+" : "-"}{" "}
                                                    {formatRupiah(
                                                        Number(tx.amount),
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {tx.accountName}
                                            </TableCell>
                                            <TableCell>
                                                {tx.attachmentPath ? (
                                                    <a
                                                        href={
                                                            tx.attachmentPath
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                    >
                                                        <FileText className="size-3.5" />
                                                        <span className="max-w-24 truncate">
                                                            {tx.attachmentName ??
                                                                "File"}
                                                        </span>
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
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
                                                                handleEdit(tx)
                                                            }
                                                        >
                                                            <Pencil className="size-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            disabled={
                                                                isDeleting
                                                            }
                                                            onClick={() =>
                                                                handleSingleDelete(
                                                                    tx,
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

                            {/* ── Footer ── */}
                            {filteredData.length > 0 && (
                                <TableFooter>
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="font-semibold"
                                        >
                                            Total
                                        </TableCell>
                                        <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                                            {formatRupiah(totalAmount)}
                                        </TableCell>
                                        <TableCell
                                            colSpan={3}
                                            className="text-right text-sm text-muted-foreground"
                                        >
                                            {filteredData.length} transaksi
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>

                    {/* ── Pagination ── */}
                    {filteredData.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <AddTransactionDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                itemOptions={itemOptions}
                accountOptions={accountOptions}
            />
            <EditTransactionDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                item={editingItem}
                itemOptions={itemOptions}
                accountOptions={accountOptions}
            />
            <ImportCsvDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
            />
        </>
    );
}
