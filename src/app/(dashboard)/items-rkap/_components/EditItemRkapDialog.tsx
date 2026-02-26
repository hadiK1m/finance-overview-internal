"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, ChevronsUpDown, Plus } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    editItemRkapSchema,
    type EditItemRkapValues,
    type ItemWithRkap,
} from "@/lib/items-rkap/schemas";
import { editItemRkapAction } from "../actions";

interface EditItemRkapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: ItemWithRkap | null;
    rkapOptions: { id: string; name: string }[];
}

export default function EditItemRkapDialog({
    open,
    onOpenChange,
    item,
    rkapOptions,
}: EditItemRkapDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [selectedRkap, setSelectedRkap] = React.useState("");
    const [rkapOpen, setRkapOpen] = React.useState(false);
    const [rkapSearch, setRkapSearch] = React.useState("");
    const [nameValue, setNameValue] = React.useState("");

    const {
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<EditItemRkapValues>({
        resolver: zodResolver(editItemRkapSchema),
    });

    // Populate form when item changes
    React.useEffect(() => {
        if (open && item) {
            setValue("id", item.id);
            setValue("name", item.name);
            setNameValue(item.name);
            const rkapName = item.rkapName ?? "";
            setValue("rkapName", rkapName);
            setSelectedRkap(rkapName);
            setServerError(null);
            setRkapSearch("");
        }
        if (!open) {
            reset();
            setSelectedRkap("");
            setNameValue("");
            setRkapSearch("");
            setServerError(null);
        }
    }, [open, item, setValue, reset]);

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setNameValue(e.target.value);
        setValue("name", e.target.value, { shouldValidate: true });
    }

    function handleRkapSelect(name: string) {
        setSelectedRkap(name);
        setValue("rkapName", name, { shouldValidate: true });
        setRkapOpen(false);
        setRkapSearch("");
    }

    const filteredRkaps = rkapOptions.filter((r) =>
        r.name.toLowerCase().includes(rkapSearch.toLowerCase()),
    );

    const showCreateOption =
        rkapSearch.trim() &&
        !rkapOptions.some(
            (r) => r.name.toLowerCase() === rkapSearch.trim().toLowerCase(),
        );

    const onSubmit = async (data: EditItemRkapValues) => {
        setServerError(null);
        const result = await editItemRkapAction(data);

        if (result.success) {
            showToast.success("Item berhasil diperbarui");
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
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>
                        Ubah nama item atau RKAP yang terkait.
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

                    {/* ── Nama Item ── */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-item-name">Nama Item</Label>
                        <Input
                            id="edit-item-name"
                            placeholder="Nama item"
                            value={nameValue}
                            onChange={handleNameChange}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

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
                                                ? "Tidak ditemukan."
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
