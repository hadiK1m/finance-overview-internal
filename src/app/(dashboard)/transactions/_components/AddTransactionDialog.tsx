"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    CalendarIcon,
    AlertCircle,
    Check,
    ChevronsUpDown,
    X,
    Upload,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn, formatRupiah } from "@/lib/utils";
import {
    addTransactionSchema,
    type AddTransactionValues,
    type ItemOption,
    type AccountOption,
} from "@/lib/transactions/schemas";
import { addTransactionAction } from "../actions";

interface AddTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemOptions: ItemOption[];
    accountOptions: AccountOption[];
}

export default function AddTransactionDialog({
    open,
    onOpenChange,
    itemOptions,
    accountOptions,
}: AddTransactionDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [amountDisplay, setAmountDisplay] = React.useState("");
    const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
    const [itemOpen, setItemOpen] = React.useState(false);
    const [itemSearch, setItemSearch] = React.useState("");
    const [fileName, setFileName] = React.useState("");
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [accountOpen, setAccountOpen] = React.useState(false);
    const [accountSearch, setAccountSearch] = React.useState("");
    const [selectedAccountName, setSelectedAccountName] = React.useState("");
    const [transactionType, setTransactionType] = React.useState<"income" | "expense">("expense");

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddTransactionValues>({
        resolver: zodResolver(addTransactionSchema),
        defaultValues: {
            itemIds: [],
            rkapId: "",
            recipientName: "",
            accountName: "",
            type: "expense",
        },
    });

    // Reset form when dialog closes
    React.useEffect(() => {
        if (!open) {
            reset();
            setSelectedDate(undefined);
            setAmountDisplay("");
            setSelectedItemIds([]);
            setItemSearch("");
            setFileName("");
            setSelectedFile(null);
            setServerError(null);
            setAccountSearch("");
            setSelectedAccountName("");
            setTransactionType("expense");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [open, reset]);

    /* ══════════════════════════════════════════════
       Item multi-select with auto RKAP
       ══════════════════════════════════════════════ */

    // Determine the locked RKAP from first selected item
    const lockedRkapId =
        selectedItemIds.length > 0
            ? itemOptions.find((i) => i.id === selectedItemIds[0])?.rkapId ??
            null
            : null;

    const lockedRkapName =
        lockedRkapId
            ? itemOptions.find((i) => i.rkapId === lockedRkapId)?.rkapName ??
            ""
            : "";

    // Filter items: same RKAP if already selected, exclude already selected, match search
    const filteredItems = itemOptions.filter((item) => {
        if (selectedItemIds.includes(item.id)) return false;
        if (
            itemSearch &&
            !item.name.toLowerCase().includes(itemSearch.toLowerCase())
        )
            return false;
        if (lockedRkapId && item.rkapId !== lockedRkapId) return false;
        return true;
    });

    function handleItemSelect(id: string) {
        const item = itemOptions.find((i) => i.id === id);
        if (!item) return;

        const next = [...selectedItemIds, id];
        setSelectedItemIds(next);
        setValue("itemIds", next, { shouldValidate: true });

        // Auto-set RKAP from item
        setValue("rkapId", item.rkapId, { shouldValidate: true });
        setItemSearch("");
    }

    function handleItemRemove(id: string) {
        const next = selectedItemIds.filter((i) => i !== id);
        setSelectedItemIds(next);
        setValue("itemIds", next, { shouldValidate: next.length > 0 });

        // If all cleared, clear RKAP
        if (next.length === 0) {
            setValue("rkapId", "", { shouldValidate: false });
        } else {
            // Re-derive RKAP from remaining items
            const firstItem = itemOptions.find((i) => i.id === next[0]);
            if (firstItem) {
                setValue("rkapId", firstItem.rkapId, { shouldValidate: true });
            }
        }
    }

    /* ── Rupiah formatter ── */
    function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value;

        if (raw === "") {
            setAmountDisplay("");
            setValue("amount", 0, { shouldValidate: true });
            return;
        }

        let cleaned = raw.replace(/[^\d,]/g, "");
        const parts = cleaned.split(",");
        if (parts.length > 2) {
            cleaned = parts[0] + "," + parts.slice(1).join("");
        }

        const intPart = parts[0];
        const decPart = parts[1]?.slice(0, 2);
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        const display =
            decPart !== undefined
                ? `${formattedInt},${decPart}`
                : formattedInt;

        setAmountDisplay(display);

        const numericStr =
            decPart !== undefined ? `${intPart}.${decPart}` : intPart;
        const numericValue = parseFloat(numericStr) || 0;
        setValue("amount", numericValue, { shouldValidate: true });
    }

    /* ── File input ── */
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
        setFileName(file?.name ?? "");
    }

    function clearFile() {
        setSelectedFile(null);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    /* ── Submit ── */
    const onSubmit = async (data: AddTransactionValues) => {
        setServerError(null);

        const fd = new FormData();
        fd.set("data", JSON.stringify(data));

        if (selectedFile) {
            fd.set("attachment", selectedFile);
        }

        const result = await addTransactionAction(fd);

        if (result.success) {
            showToast.success("Transaksi berhasil ditambahkan");
            onOpenChange(false);
        } else {
            setServerError(result.error);
            showToast.error(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Buat Transaksi</DialogTitle>
                    <DialogDescription>
                        Tambahkan transaksi baru.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* ── Server error ── */}
                    {serverError && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {/* ── Tanggal ── */}
                    <div className="space-y-2">
                        <Label>Tanggal</Label>
                        <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !selectedDate &&
                                        "text-muted-foreground",
                                    )}
                                >
                                    <CalendarIcon className="size-4" />
                                    {selectedDate
                                        ? format(
                                            selectedDate,
                                            "dd MMMM yyyy",
                                            { locale: localeId },
                                        )
                                        : "Pilih tanggal"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        if (date) {
                                            setSelectedDate(date);
                                            setValue("date", date, {
                                                shouldValidate: true,
                                            });
                                        }
                                        setCalendarOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.date && (
                            <p className="text-xs text-destructive">
                                Tanggal wajib dipilih
                            </p>
                        )}
                    </div>

                    {/* ── Item (multi-select → auto RKAP) ── */}
                    <div className="space-y-2">
                        <Label>
                            Item
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (pilih satu atau lebih)
                            </span>
                        </Label>

                        {/* Selected item badges */}
                        {selectedItemIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedItemIds.map((id) => {
                                    const item = itemOptions.find(
                                        (i) => i.id === id,
                                    );
                                    return (
                                        <Badge
                                            key={id}
                                            variant="secondary"
                                            className="gap-1 pr-1"
                                        >
                                            {item?.name ?? id}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleItemRemove(id)
                                                }
                                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}

                        <Popover open={itemOpen} onOpenChange={setItemOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={itemOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="text-muted-foreground">
                                        {selectedItemIds.length > 0
                                            ? `${selectedItemIds.length} item dipilih`
                                            : "Pilih item…"}
                                    </span>
                                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-(--radix-popover-trigger-width) p-0"
                                align="start"
                            >
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Cari item…"
                                        value={itemSearch}
                                        onValueChange={setItemSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            Tidak ada item yang ditemukan.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {filteredItems.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.name}
                                                    onSelect={() =>
                                                        handleItemSelect(
                                                            item.id,
                                                        )
                                                    }
                                                >
                                                    <Check
                                                        className={cn(
                                                            "size-4",
                                                            selectedItemIds.includes(
                                                                item.id,
                                                            )
                                                                ? "opacity-100"
                                                                : "opacity-0",
                                                        )}
                                                    />
                                                    <span>{item.name}</span>
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {item.rkapName}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.itemIds && (
                            <p className="text-xs text-destructive">
                                {errors.itemIds.message}
                            </p>
                        )}
                    </div>

                    {/* ── Nama RKAP (auto-filled, read-only) ── */}
                    <div className="space-y-2">
                        <Label>Nama RKAP</Label>
                        <Input
                            readOnly
                            value={lockedRkapName}
                            placeholder="Otomatis dari item yang dipilih"
                            className="bg-muted"
                        />
                        {errors.rkapId && (
                            <p className="text-xs text-destructive">
                                {errors.rkapId.message}
                            </p>
                        )}
                    </div>

                    {/* ── Penerima Uang ── */}
                    <div className="space-y-2">
                        <Label htmlFor="tx-recipient">Penerima Uang</Label>
                        <Input
                            id="tx-recipient"
                            placeholder="Nama penerima uang"
                            {...register("recipientName")}
                        />
                        {errors.recipientName && (
                            <p className="text-xs text-destructive">
                                {errors.recipientName.message}
                            </p>
                        )}
                    </div>

                    {/* ── Jumlah (IDR) + Tipe ── */}
                    <div className="space-y-2">
                        <Label htmlFor="tx-amount">Jumlah (IDR)</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex overflow-hidden rounded-md border">
                                <button
                                    type="button"
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium transition-colors",
                                        transactionType === "expense"
                                            ? "bg-red-600 text-white"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                                    )}
                                    onClick={() => {
                                        setTransactionType("expense");
                                        setValue("type", "expense");
                                    }}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium transition-colors",
                                        transactionType === "income"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                                    )}
                                    onClick={() => {
                                        setTransactionType("income");
                                        setValue("type", "income");
                                    }}
                                >
                                    Income
                                </button>
                            </div>
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    Rp
                                </span>
                                <Input
                                    id="tx-amount"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    className={cn(
                                        "pl-9",
                                        transactionType === "expense"
                                            ? "text-red-600"
                                            : "text-emerald-600",
                                    )}
                                    value={amountDisplay}
                                    onChange={handleAmountChange}
                                />
                            </div>
                        </div>
                        {errors.amount && (
                            <p className="text-xs text-destructive">
                                {errors.amount.message}
                            </p>
                        )}
                    </div>

                    {/* ── Nama Akun (dropdown dari balance_sheets) ── */}
                    <div className="space-y-2">
                        <Label>Nama Akun</Label>
                        <Popover
                            open={accountOpen}
                            onOpenChange={setAccountOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={accountOpen}
                                    className={cn(
                                        "w-full justify-between font-normal",
                                        !selectedAccountName &&
                                        "text-muted-foreground",
                                    )}
                                >
                                    {selectedAccountName || "Pilih nama akun…"}
                                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-(--radix-popover-trigger-width) p-0"
                                align="start"
                            >
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Cari nama akun…"
                                        value={accountSearch}
                                        onValueChange={setAccountSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            Tidak ada akun ditemukan.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {accountOptions
                                                .filter((acc) =>
                                                    accountSearch
                                                        ? acc.name
                                                            .toLowerCase()
                                                            .includes(
                                                                accountSearch.toLowerCase(),
                                                            )
                                                        : true,
                                                )
                                                .map((acc) => (
                                                    <CommandItem
                                                        key={acc.id}
                                                        value={acc.name}
                                                        onSelect={() => {
                                                            setSelectedAccountName(
                                                                acc.name,
                                                            );
                                                            setValue(
                                                                "accountName",
                                                                acc.name,
                                                                {
                                                                    shouldValidate:
                                                                        true,
                                                                },
                                                            );
                                                            setAccountOpen(
                                                                false,
                                                            );
                                                            setAccountSearch(
                                                                "",
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "size-4",
                                                                selectedAccountName ===
                                                                    acc.name
                                                                    ? "opacity-100"
                                                                    : "opacity-0",
                                                            )}
                                                        />
                                                        {acc.name}
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.accountName && (
                            <p className="text-xs text-destructive">
                                {errors.accountName.message}
                            </p>
                        )}
                        {selectedAccountName && (() => {
                            const acc = accountOptions.find(
                                (a) => a.name === selectedAccountName,
                            );
                            if (!acc) return null;
                            const bal = Number(acc.balance);
                            return (
                                <p className="text-xs text-muted-foreground">
                                    Sisa saldo:{" "}
                                    <span className="font-semibold text-foreground">
                                        {formatRupiah(bal)}
                                    </span>
                                </p>
                            );
                        })()}
                    </div>

                    {/* ── Lampiran (File) ── */}
                    <div className="space-y-2">
                        <Label>Lampiran</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="size-4" />
                                Pilih File
                            </Button>
                            {fileName ? (
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="max-w-48 truncate">
                                        {fileName}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="rounded-full p-0.5 hover:bg-muted"
                                    >
                                        <X className="size-3 text-muted-foreground" />
                                    </button>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    Belum ada file (maks 10 MB)
                                </span>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Menyimpan…" : "Simpan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
