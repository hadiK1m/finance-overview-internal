"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/show-toast";
import { Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameItemAction } from "../actions";
import type { DriveItemRef } from "@/lib/drive/schemas";

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: DriveItemRef;
}

export default function RenameDialog({
    open,
    onOpenChange,
    item,
}: RenameDialogProps) {
    const router = useRouter();
    const [name, setName] = useState(item.name);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || name.trim() === item.name) return;

        setLoading(true);
        try {
            const result = await renameItemAction(
                item.id,
                item.type,
                name.trim(),
            );
            if (result.success) {
                showToast.success("Berhasil diubah namanya");
                onOpenChange(false);
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal mengubah nama");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-4 text-blue-500" />
                        Rename
                    </DialogTitle>
                    <DialogDescription>
                        Ubah nama {item.type === "folder" ? "folder" : "file"}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-input">Nama Baru</Label>
                        <Input
                            id="rename-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            onFocus={(e) => {
                                // Select filename without extension
                                const dotIdx = e.target.value.lastIndexOf(".");
                                if (dotIdx > 0 && item.type === "file") {
                                    e.target.setSelectionRange(0, dotIdx);
                                } else {
                                    e.target.select();
                                }
                            }}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim() || name.trim() === item.name}
                        >
                            {loading ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
