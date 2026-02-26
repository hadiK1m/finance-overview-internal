"use client";

import * as React from "react";
import {
    Upload,
    FileSpreadsheet,
    Loader2,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { importItemsRkapCsvAction } from "../actions";

interface ImportCsvDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ImportCsvDialog({
    open,
    onOpenChange,
}: ImportCsvDialogProps) {
    const [file, setFile] = React.useState<File | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const [result, setResult] = React.useState<{
        imported: number;
        skipped: number;
        errors: string[];
    } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Reset state when dialog closes
    React.useEffect(() => {
        if (!open) {
            setFile(null);
            setIsDragging(false);
            setIsImporting(false);
            setResult(null);
        }
    }, [open]);

    function handleFileSelect(f: File) {
        if (!f.name.endsWith(".csv")) {
            showToast.error("File harus berformat .csv");
            return;
        }
        setFile(f);
        setResult(null);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) handleFileSelect(f);
        e.target.value = "";
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(true);
    }
    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
    }
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelect(f);
    }

    async function handleImport() {
        if (!file) return;

        setIsImporting(true);
        setResult(null);

        try {
            const fd = new FormData();
            fd.append("csv", file);

            const res = await importItemsRkapCsvAction(fd);

            if (res.success) {
                setResult({
                    imported: res.imported,
                    skipped: res.skipped,
                    errors: res.errors,
                });
                showToast.success(
                    `${res.imported} item berhasil diimport`,
                );
            } else {
                setResult({
                    imported: 0,
                    skipped: 0,
                    errors: res.errors ?? [res.error],
                });
                showToast.error(res.error);
            }
        } catch {
            showToast.error("Gagal mengimport data.");
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="size-5" />
                        Import Items & RKAP dari CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload file CSV sesuai template untuk menambahkan
                        items & RKAP secara massal.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Drop zone */}
                    {!result && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            disabled={isImporting}
                            className={`flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors ${isDragging
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                                } ${isImporting ? "pointer-events-none opacity-50" : ""}`}
                        >
                            <Upload className="size-8" />
                            {file ? (
                                <div className="text-center">
                                    <p className="font-medium text-foreground">
                                        {file.name}
                                    </p>
                                    <p className="text-xs">
                                        {(file.size / 1024).toFixed(1)} KB —
                                        Klik untuk ganti file
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <span>
                                        <span className="font-medium text-primary">
                                            Klik untuk upload
                                        </span>{" "}
                                        atau drag & drop
                                    </span>
                                    <span className="text-xs">
                                        File .csv — Maks 2 MB
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleInputChange}
                        className="hidden"
                    />

                    {/* Import result */}
                    {result && (
                        <div className="space-y-3">
                            {/* Summary */}
                            {result.imported > 0 && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    <span>
                                        <strong>{result.imported}</strong>{" "}
                                        item berhasil diimport
                                        {result.skipped > 0 && (
                                            <>
                                                ,{" "}
                                                <strong>{result.skipped}</strong>{" "}
                                                baris dilewati
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* Errors */}
                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                                        <AlertTriangle className="size-4 shrink-0" />
                                        {result.imported === 0
                                            ? "Error"
                                            : `${result.errors.length} baris bermasalah`}
                                    </div>
                                    <ScrollArea className="h-40 rounded-lg border bg-muted/50 p-3">
                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                            {result.errors.map((err, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-start gap-1.5"
                                                >
                                                    <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                                                    {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 pt-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {result?.imported ? "Tutup" : "Batal"}
                    </Button>
                    {!result?.imported && (
                        <Button
                            type="button"
                            disabled={!file || isImporting}
                            onClick={handleImport}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Mengimport…
                                </>
                            ) : (
                                <>
                                    <Upload className="size-4" />
                                    Import Data
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
