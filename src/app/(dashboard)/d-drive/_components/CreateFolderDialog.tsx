"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/show-toast";
import { FolderPlus } from "lucide-react";
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
import { createFolderAction } from "../actions";

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentId: string | null;
}

export default function CreateFolderDialog({
    open,
    onOpenChange,
    parentId,
}: CreateFolderDialogProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const result = await createFolderAction(name.trim(), parentId);
            if (result.success) {
                showToast.success("Folder berhasil dibuat");
                setName("");
                onOpenChange(false);
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal membuat folder");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="size-5 text-blue-500" />
                        New Folder
                    </DialogTitle>
                    <DialogDescription>
                        Buat folder baru untuk mengorganisir file Anda.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="folder-name">Nama Folder</Label>
                        <Input
                            id="folder-name"
                            placeholder="Untitled folder"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
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
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? "Membuat..." : "Buat Folder"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
