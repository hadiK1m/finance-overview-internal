"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    CalendarIcon,
    AlertCircle,
    Check,
    ChevronsUpDown,
    ArrowRight,
    X,
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
    transferBalanceSchema,
    type TransferBalanceValues,
    type AccountOption,
    type ItemOption,
} from "@/lib/transactions/schemas";
import { transferBalanceAction } from "../actions";

interface TransferBalanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountOptions: AccountOption[];
    itemOptions: ItemOption[];
}

export default function TransferBalanceDialog({
    open,
    onOpenChange,
    accountOptions,
    itemOptions,
}: TransferBalanceDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [amountDisplay, setAmountDisplay] = React.useState("");

    // From account
    const [fromOpen, setFromOpen] = React.useState(false);
    const [fromSearch, setFromSearch] = React.useState("");
    const [fromAccountName, setFromAccountName] = React.useState("");

    // To account
    const [toOpen, setToOpen] = React.useState(false);
    const [toSearch, setToSearch] = React.useState("");
    const [toAccountName, setToAccountName] = React.useState("");

    // Item selection
    const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
    const [itemOpen, setItemOpen] = React.useState(false);
    const [itemSearch, setItemSearch] = React.useState("");

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TransferBalanceValues>({
        resolver: zodResolver(transferBalanceSchema),
        defaultValues: {
            itemIds: [],
            fromAccountName: "",
            toAccountName: "",
            description: "",
        },
    });

    // Reset form when dialog closes
    React.useEffect(() => {
        if (!open) {
            reset();
            setSelectedDate(undefined);
            setAmountDisplay("");
            setFromAccountName("");
            setToAccountName("");
            setFromSearch("");
            setToSearch("");
            setSelectedItemIds([]);
            setItemSearch("");
            setServerError(null);
        }
    }, [open, reset]);

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

    /* ── Source account balance ── */
    const fromAccount = accountOptions.find(
        (a) => a.name === fromAccountName,
    );
    const fromBalance = fromAccount ? Number(fromAccount.balance) : 0;

    /* ── Destination account balance ── */
    const toAccount = accountOptions.find((a) => a.name === toAccountName);
    const toBalance = toAccount ? Number(toAccount.balance) : 0;

    /* ── Cash Advanced items only ── */
    const cashAdvancedItems = React.useMemo(
        () => itemOptions.filter((i) => i.rkapName?.toLowerCase().trim() === "cash advanced"),
        [itemOptions],
    );

    const filteredItems = cashAdvancedItems.filter((item) => {
        if (selectedItemIds.includes(item.id)) return false;
        if (itemSearch && !item.name.toLowerCase().includes(itemSearch.toLowerCase())) return false;
        return true;
    });

    function handleItemSelect(id: string) {
        const next = [...selectedItemIds, id];
        setSelectedItemIds(next);
        setValue("itemIds", next, { shouldValidate: true });
        setItemSearch("");
    }

    function handleItemRemove(id: string) {
        const next = selectedItemIds.filter((i) => i !== id);
        setSelectedItemIds(next);
        setValue("itemIds", next, { shouldValidate: next.length > 0 });
    }

    /* ── Submit ── */
    const onSubmit = async (data: TransferBalanceValues) => {
        setServerError(null);

        const result = await transferBalanceAction(JSON.stringify(data));

        if (result.success) {
            showToast.success(
                `Berhasil memindahkan ${formatRupiah(data.amount)} dari ${data.fromAccountName} ke ${data.toAccountName}`,
            );
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
                    <DialogTitle>Pemindahan Saldo</DialogTitle>
                    <DialogDescription>
                        Pindahkan saldo antar akun. Akan tercatat sebagai RKAP
                        &quot;Cash Advanced&quot;.
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

                    {/* ── Item (multi-select, Cash Advanced items only) ── */}
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
                                    const item = cashAdvancedItems.find(
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
                                            Tidak ada item ditemukan.
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
                        {cashAdvancedItems.length === 0 && (
                            <p className="text-xs text-amber-600">
                                Tidak ada item di bawah RKAP &quot;Cash Advanced&quot;. Silakan buat item terlebih dahulu.
                            </p>
                        )}
                    </div>

                    {/* ── Transfer visual: From → To ── */}
                    <div className="space-y-3">
                        {/* From Account */}
                        <div className="space-y-2">
                            <Label>Dari Akun (Sumber)</Label>
                            <Popover open={fromOpen} onOpenChange={setFromOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={fromOpen}
                                        className={cn(
                                            "w-full justify-between font-normal",
                                            !fromAccountName &&
                                            "text-muted-foreground",
                                        )}
                                    >
                                        {fromAccountName ||
                                            "Pilih akun sumber…"}
                                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-(--radix-popover-trigger-width) p-0"
                                    align="start"
                                >
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Cari akun…"
                                            value={fromSearch}
                                            onValueChange={setFromSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                Tidak ada akun ditemukan.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {accountOptions
                                                    .filter((acc) =>
                                                        fromSearch
                                                            ? acc.name
                                                                .toLowerCase()
                                                                .includes(
                                                                    fromSearch.toLowerCase(),
                                                                )
                                                            : true,
                                                    )
                                                    .map((acc) => (
                                                        <CommandItem
                                                            key={acc.id}
                                                            value={acc.name}
                                                            onSelect={() => {
                                                                setFromAccountName(
                                                                    acc.name,
                                                                );
                                                                setValue(
                                                                    "fromAccountName",
                                                                    acc.name,
                                                                    {
                                                                        shouldValidate:
                                                                            true,
                                                                    },
                                                                );
                                                                setFromOpen(
                                                                    false,
                                                                );
                                                                setFromSearch(
                                                                    "",
                                                                );
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "size-4",
                                                                    fromAccountName ===
                                                                        acc.name
                                                                        ? "opacity-100"
                                                                        : "opacity-0",
                                                                )}
                                                            />
                                                            <div className="flex w-full items-center justify-between">
                                                                <span>
                                                                    {acc.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {formatRupiah(
                                                                        Number(
                                                                            acc.balance,
                                                                        ),
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.fromAccountName && (
                                <p className="text-xs text-destructive">
                                    {errors.fromAccountName.message}
                                </p>
                            )}
                            {fromAccountName && (
                                <p className="text-xs text-muted-foreground">
                                    Saldo saat ini:{" "}
                                    <span className="font-semibold text-foreground">
                                        {formatRupiah(fromBalance)}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex items-center justify-center">
                            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
                                <span>Pindah ke</span>
                                <ArrowRight className="size-3.5" />
                            </div>
                        </div>

                        {/* To Account */}
                        <div className="space-y-2">
                            <Label>Ke Akun (Tujuan)</Label>
                            <Popover open={toOpen} onOpenChange={setToOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={toOpen}
                                        className={cn(
                                            "w-full justify-between font-normal",
                                            !toAccountName &&
                                            "text-muted-foreground",
                                        )}
                                    >
                                        {toAccountName ||
                                            "Pilih akun tujuan…"}
                                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-(--radix-popover-trigger-width) p-0"
                                    align="start"
                                >
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Cari akun…"
                                            value={toSearch}
                                            onValueChange={setToSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                Tidak ada akun ditemukan.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {accountOptions
                                                    .filter((acc) => {
                                                        // Exclude source account
                                                        if (
                                                            acc.name ===
                                                            fromAccountName
                                                        )
                                                            return false;
                                                        if (toSearch) {
                                                            return acc.name
                                                                .toLowerCase()
                                                                .includes(
                                                                    toSearch.toLowerCase(),
                                                                );
                                                        }
                                                        return true;
                                                    })
                                                    .map((acc) => (
                                                        <CommandItem
                                                            key={acc.id}
                                                            value={acc.name}
                                                            onSelect={() => {
                                                                setToAccountName(
                                                                    acc.name,
                                                                );
                                                                setValue(
                                                                    "toAccountName",
                                                                    acc.name,
                                                                    {
                                                                        shouldValidate:
                                                                            true,
                                                                    },
                                                                );
                                                                setToOpen(
                                                                    false,
                                                                );
                                                                setToSearch("");
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "size-4",
                                                                    toAccountName ===
                                                                        acc.name
                                                                        ? "opacity-100"
                                                                        : "opacity-0",
                                                                )}
                                                            />
                                                            <div className="flex w-full items-center justify-between">
                                                                <span>
                                                                    {acc.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {formatRupiah(
                                                                        Number(
                                                                            acc.balance,
                                                                        ),
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.toAccountName && (
                                <p className="text-xs text-destructive">
                                    {errors.toAccountName.message}
                                </p>
                            )}
                            {toAccountName && (
                                <p className="text-xs text-muted-foreground">
                                    Saldo saat ini:{" "}
                                    <span className="font-semibold text-foreground">
                                        {formatRupiah(toBalance)}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Jumlah Transfer ── */}
                    <div className="space-y-2">
                        <Label htmlFor="transfer-amount">
                            Jumlah Pemindahan (IDR)
                        </Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                Rp
                            </span>
                            <Input
                                id="transfer-amount"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                className="pl-9 text-sky-600"
                                value={amountDisplay}
                                onChange={handleAmountChange}
                            />
                        </div>
                        {errors.amount && (
                            <p className="text-xs text-destructive">
                                {errors.amount.message}
                            </p>
                        )}
                    </div>

                    {/* ── Keterangan ── */}
                    <div className="space-y-2">
                        <Label htmlFor="transfer-desc">Keterangan</Label>
                        <Input
                            id="transfer-desc"
                            placeholder="cth: Pengisian kas dari bank"
                            {...register("description")}
                        />
                        {errors.description && (
                            <p className="text-xs text-destructive">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* ── Preview ringkasan ── */}
                    {fromAccountName &&
                        toAccountName &&
                        amountDisplay && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
                                <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
                                    Ringkasan Pemindahan
                                </p>
                                <div className="mt-2 space-y-1 text-sm text-sky-600 dark:text-sky-400">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-red-500">
                                            {fromAccountName}
                                        </span>
                                        <ArrowRight className="size-3.5" />
                                        <span className="font-semibold text-emerald-600">
                                            {toAccountName}
                                        </span>
                                    </div>
                                    <p className="font-bold">
                                        Rp {amountDisplay}
                                    </p>
                                </div>
                            </div>
                        )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-sky-600 hover:bg-sky-700"
                        >
                            {isSubmitting
                                ? "Memproses…"
                                : "Pindahkan Saldo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
