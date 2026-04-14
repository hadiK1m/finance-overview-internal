"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    Check,
    ChevronsUpDown,
    Plus,
    X,
} from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    addItemRkapSchema,
    type AddItemRkapValues,
} from "@/lib/items-rkap/schemas";
import { addItemRkapAction } from "../actions";

interface AddItemRkapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rkapOptions: { id: string; name: string }[];
    itemOptions: string[];
}

export default function AddItemRkapDialog({
    open,
    onOpenChange,
    rkapOptions,
    itemOptions,
}: AddItemRkapDialogProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [itemTags, setItemTags] = React.useState<string[]>([]);
    const [selectedRkap, setSelectedRkap] = React.useState("");
    const [rkapOpen, setRkapOpen] = React.useState(false);
    const [rkapSearch, setRkapSearch] = React.useState("");
    const [itemOpen, setItemOpen] = React.useState(false);
    const [itemSearch, setItemSearch] = React.useState("");

    const {
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddItemRkapValues>({
        resolver: zodResolver(addItemRkapSchema),
        defaultValues: {
            itemNames: [],
            rkapName: "",
        },
    });

    // Reset form when dialog closes
    React.useEffect(() => {
        if (!open) {
            reset();
            setItemTags([]);
            setSelectedRkap("");
            setRkapSearch("");
            setItemSearch("");
            setServerError(null);
        }
    }, [open, reset]);

    /* ══════════════════════════════════════════════
       Item multi-select (searchable + creatable)
       ══════════════════════════════════════════════ */

    function handleItemSelect(name: string) {
        if (itemTags.includes(name)) return; // prevent duplicates
        const next = [...itemTags, name];
        setItemTags(next);
        setValue("itemNames", next, { shouldValidate: true });
        setItemSearch("");
    }

    function handleItemRemove(name: string) {
        const next = itemTags.filter((t) => t !== name);
        setItemTags(next);
        setValue("itemNames", next, { shouldValidate: next.length > 0 });
    }

    const filteredItems = itemOptions.filter(
        (name) =>
            name.toLowerCase().includes(itemSearch.toLowerCase()) &&
            !itemTags.includes(name),
    );

    const showItemCreateOption =
        itemSearch.trim() &&
        !itemOptions.some(
            (n) => n.toLowerCase() === itemSearch.trim().toLowerCase(),
        ) &&
        !itemTags.some(
            (t) => t.toLowerCase() === itemSearch.trim().toLowerCase(),
        );

    /* ══════════════════════════════════════════════
       RKAP select
       ══════════════════════════════════════════════ */

    function handleRkapSelect(name: string) {
        setSelectedRkap(name);
        setValue("rkapName", name, { shouldValidate: true });
        setRkapOpen(false);
        setRkapSearch("");
    }

    function handleRkapClear(e: React.MouseEvent) {
        e.stopPropagation();
        setSelectedRkap("");
        setValue("rkapName", "", { shouldValidate: false });
    }

    const filteredRkaps = rkapOptions.filter((r) =>
        r.name.toLowerCase().includes(rkapSearch.toLowerCase()),
    );

    const showCreateOption =
        rkapSearch.trim() &&
        !rkapOptions.some(
            (r) => r.name.toLowerCase() === rkapSearch.trim().toLowerCase(),
        );

    /* ── Submit ── */
    const onSubmit = async (data: AddItemRkapValues) => {
        setServerError(null);
        const result = await addItemRkapAction(data);

        if (result.success) {
            showToast.success(
                `${data.itemNames.length} item berhasil ditambahkan`,
            );
            reset();
            setItemTags([]);
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
                    <DialogTitle>Tambah Items & RKAP</DialogTitle>
                    <DialogDescription>
                        Tambahkan item baru dan pilih atau buat nama RKAP.
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

                    {/* ── Item Names (searchable multi-select) ── */}
                    <div className="space-y-2">
                        <Label>
                            Nama Item
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (cari atau buat baru)
                            </span>
                        </Label>

                        {/* Selected item tags */}
                        {itemTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {itemTags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="gap-1 pr-1"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleItemRemove(tag)
                                            }
                                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Searchable popover */}
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
                                        {itemTags.length > 0
                                            ? `${itemTags.length} item dipilih`
                                            : "Cari atau buat item…"}
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
                                        placeholder="Cari nama item…"
                                        value={itemSearch}
                                        onValueChange={setItemSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            {itemSearch
                                                ? "Tidak ditemukan. Klik opsi di bawah untuk membuat baru."
                                                : "Belum ada data item."}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {filteredItems.map((name) => (
                                                <CommandItem
                                                    key={name}
                                                    value={name}
                                                    onSelect={() =>
                                                        handleItemSelect(name)
                                                    }
                                                >
                                                    <Check
                                                        className={cn(
                                                            "size-4",
                                                            itemTags.includes(
                                                                name,
                                                            )
                                                                ? "opacity-100"
                                                                : "opacity-0",
                                                        )}
                                                    />
                                                    {name}
                                                </CommandItem>
                                            ))}
                                            {showItemCreateOption && (
                                                <CommandItem
                                                    value={`__create__${itemSearch}`}
                                                    onSelect={() =>
                                                        handleItemSelect(
                                                            itemSearch.trim(),
                                                        )
                                                    }
                                                >
                                                    <Plus className="size-4" />
                                                    Buat baru: &quot;
                                                    {itemSearch.trim()}&quot;
                                                </CommandItem>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.itemNames && (
                            <p className="text-xs text-destructive">
                                {errors.itemNames.message}
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
                                    {selectedRkap ? (
                                        <span className="flex items-center gap-2 truncate">
                                            {selectedRkap}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Pilih atau buat RKAP…
                                        </span>
                                    )}
                                    <span className="flex shrink-0 items-center gap-1">
                                        {selectedRkap && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={handleRkapClear}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    )
                                                        handleRkapClear(
                                                            e as unknown as React.MouseEvent,
                                                        );
                                                }}
                                                className="rounded-full p-0.5 hover:bg-muted"
                                            >
                                                <X className="size-3.5 text-muted-foreground" />
                                            </span>
                                        )}
                                        <ChevronsUpDown className="size-4 opacity-50" />
                                    </span>
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
