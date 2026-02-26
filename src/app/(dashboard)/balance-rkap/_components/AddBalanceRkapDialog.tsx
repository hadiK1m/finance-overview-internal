"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    CalendarIcon,
    AlertCircle,
    Check,
    ChevronsUpDown,
    Plus,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import {
    addBalanceRkapSchema,
    type AddBalanceRkapValues,
} from "@/lib/balance-rkap/schemas";
import { addBalanceRkapAction } from "../actions";

interface AddBalanceRkapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rkapOptions: { id: string; name: string }[];
    usedRkapNames: Set<string>;
}

export default function AddBalanceRkapDialog({
    open,
    onOpenChange,
    rkapOptions,
    usedRkapNames,
}: AddBalanceRkapDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [balanceDisplay, setBalanceDisplay] = React.useState("");
    const [selectedRkap, setSelectedRkap] = React.useState("");
    const [rkapOpen, setRkapOpen] = React.useState(false);
    const [rkapSearch, setRkapSearch] = React.useState("");

    const {
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddBalanceRkapValues>({
        resolver: zodResolver(addBalanceRkapSchema),
        defaultValues: {
            rkapName: "",
        },
    });

    // Reset form when dialog closes
    React.useEffect(() => {
        if (!open) {
            reset();
            setSelectedDate(undefined);
            setBalanceDisplay("");
            setSelectedRkap("");
            setRkapSearch("");
            setServerError(null);
        }
    }, [open, reset]);

    /* ── Rupiah formatter ── */
    function handleBalanceChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value;

        if (raw === "") {
            setBalanceDisplay("");
            setValue("balance", 0, { shouldValidate: true });
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

        setBalanceDisplay(display);

        const numericStr =
            decPart !== undefined ? `${intPart}.${decPart}` : intPart;
        const numericValue = parseFloat(numericStr) || 0;
        setValue("balance", numericValue, { shouldValidate: true });
    }

    /* ── RKAP select ── */
    function handleRkapSelect(name: string) {
        setSelectedRkap(name);
        setValue("rkapName", name, { shouldValidate: true });
        setRkapOpen(false);
        setRkapSearch("");
    }

    const filteredRkaps = rkapOptions.filter(
        (r) =>
            r.name.toLowerCase().includes(rkapSearch.toLowerCase()) &&
            !usedRkapNames.has(r.name),
    );

    const showCreateOption =
        rkapSearch.trim() &&
        !rkapOptions.some(
            (r) => r.name.toLowerCase() === rkapSearch.trim().toLowerCase(),
        ) &&
        !usedRkapNames.has(rkapSearch.trim());

    /* ── Submit ── */
    const onSubmit = async (data: AddBalanceRkapValues) => {
        setServerError(null);
        const result = await addBalanceRkapAction(data);

        if (result.success) {
            showToast.success("Saldo RKAP berhasil ditambahkan");
            reset();
            setSelectedDate(undefined);
            setBalanceDisplay("");
            setSelectedRkap("");
            onOpenChange(false);
        } else {
            setServerError(result.error);
            showToast.error(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tambah Saldo RKAP</DialogTitle>
                    <DialogDescription>
                        Tambahkan saldo baru untuk data RKAP.
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

                    {/* ── RKAP Name (creatable single select) ── */}
                    <div className="space-y-2">
                        <Label>
                            Nama RKAP
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (pilih atau buat baru)
                            </span>
                        </Label>
                        <Popover open={rkapOpen} onOpenChange={setRkapOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={rkapOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    {selectedRkap || (
                                        <span className="text-muted-foreground">
                                            Pilih atau buat RKAP…
                                        </span>
                                    )}
                                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-(--radix-popover-trigger-width) p-0"
                                align="start"
                            >
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Cari atau buat RKAP…"
                                        value={rkapSearch}
                                        onValueChange={setRkapSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            {rkapSearch
                                                ? "Tidak ditemukan. Klik opsi di bawah untuk membuat baru."
                                                : "Belum ada data RKAP."}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {filteredRkaps.map((rkap) => (
                                                <CommandItem
                                                    key={rkap.id}
                                                    value={rkap.name}
                                                    onSelect={() =>
                                                        handleRkapSelect(
                                                            rkap.name,
                                                        )
                                                    }
                                                >
                                                    <Check
                                                        className={cn(
                                                            "size-4",
                                                            selectedRkap ===
                                                                rkap.name
                                                                ? "opacity-100"
                                                                : "opacity-0",
                                                        )}
                                                    />
                                                    {rkap.name}
                                                </CommandItem>
                                            ))}
                                            {showCreateOption && (
                                                <CommandItem
                                                    value={`__create__${rkapSearch}`}
                                                    onSelect={() =>
                                                        handleRkapSelect(
                                                            rkapSearch.trim(),
                                                        )
                                                    }
                                                >
                                                    <Plus className="size-4" />
                                                    Buat baru: &quot;
                                                    {rkapSearch.trim()}&quot;
                                                </CommandItem>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.rkapName && (
                            <p className="text-xs text-destructive">
                                {errors.rkapName.message}
                            </p>
                        )}
                    </div>

                    {/* ── Saldo (IDR) ── */}
                    <div className="space-y-2">
                        <Label htmlFor="br-balance">Saldo (IDR)</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                Rp
                            </span>
                            <Input
                                id="br-balance"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                className="pl-9"
                                value={balanceDisplay}
                                onChange={handleBalanceChange}
                            />
                        </div>
                        {errors.balance && (
                            <p className="text-xs text-destructive">
                                {errors.balance.message}
                            </p>
                        )}
                    </div>

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
