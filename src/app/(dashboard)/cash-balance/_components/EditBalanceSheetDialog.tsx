"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
    editBalanceSheetSchema,
    type EditBalanceSheetValues,
} from "@/lib/cash-balance/schemas";
import { editBalanceSheetAction } from "../actions";
import type { BalanceSheet } from "@/db/schema";

interface EditBalanceSheetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: BalanceSheet | null;
}

/**
 * Format angka ke string Rupiah Indonesia: 40.500.000,50
 */
function numberToRupiahDisplay(value: number): string {
    if (value === 0) return "";
    const [intPart, decPart] = value.toFixed(2).split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (decPart && decPart !== "00") {
        return `${formattedInt},${decPart}`;
    }
    return formattedInt;
}

export default function EditBalanceSheetDialog({
    open,
    onOpenChange,
    item,
}: EditBalanceSheetDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [balanceDisplay, setBalanceDisplay] = React.useState("");

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<EditBalanceSheetValues>({
        resolver: zodResolver(editBalanceSheetSchema),
    });

    // Populate form when item changes
    React.useEffect(() => {
        if (open && item) {
            const balanceNum = Number(item.balance);
            const dateVal = new Date(item.date);
            reset({
                id: item.id,
                name: item.name,
                balance: balanceNum,
                date: dateVal,
            });
            setSelectedDate(dateVal);
            setBalanceDisplay(numberToRupiahDisplay(balanceNum));
            setServerError(null);
        }
    }, [open, item, reset]);

    // Reset on close
    React.useEffect(() => {
        if (!open) {
            reset();
            setSelectedDate(undefined);
            setBalanceDisplay("");
            setServerError(null);
        }
    }, [open, reset]);

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

    const onSubmit = async (data: EditBalanceSheetValues) => {
        setServerError(null);

        const result = await editBalanceSheetAction(data);

        if (result.success) {
            showToast.success("Nama akun berhasil diperbarui");
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
                    <DialogTitle>Edit Nama Akun</DialogTitle>
                    <DialogDescription>
                        Ubah informasi sumber dana.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {serverError && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {/* ── Nama Akun ── */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-bs-name">Nama Akun</Label>
                        <Input
                            id="edit-bs-name"
                            placeholder="Contoh: Dana Operasional Q1"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* ── Saldo (IDR) ── */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-bs-balance">Saldo (IDR)</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                Rp
                            </span>
                            <Input
                                id="edit-bs-balance"
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
                            {isSubmitting ? "Menyimpan…" : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
