"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { uploadAvatarAction, removeAvatarAction } from "../actions";

interface AvatarUploadProps {
    currentImage: string | null;
    userName: string;
}

export default function AvatarUpload({
    currentImage,
    userName,
}: AvatarUploadProps) {
    const [preview, setPreview] = React.useState<string | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isRemoving, setIsRemoving] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    /** Display: preview > current avatar > initials fallback */
    const displayImage = preview ?? currentImage;
    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    /**
     * Process selected file: validate, preview, then upload.
     */
    async function handleFile(file: File) {
        // Client-side validation (server also validates)
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            showToast.error("Format tidak didukung. Gunakan JPG, PNG, atau WEBP.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast.error("Ukuran file maksimal 5 MB.");
            return;
        }

        // Show preview immediately (optimistic)
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Upload via Server Action
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const result = await uploadAvatarAction(fd);

            if (result.success) {
                showToast.success("Foto profil berhasil diperbarui");
                // Preview will be replaced by revalidated data
            } else {
                showToast.error(result.error);
                setPreview(null); // Revert optimistic preview
            }
        } catch {
            showToast.error("Gagal mengupload foto.");
            setPreview(null);
        } finally {
            setIsUploading(false);
            URL.revokeObjectURL(objectUrl);
        }
    }

    /** Input onChange handler */
    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset input so re-selecting same file triggers change
        e.target.value = "";
    }

    /** Remove avatar */
    async function handleRemove() {
        setIsRemoving(true);
        try {
            const result = await removeAvatarAction();
            if (result.success) {
                setPreview(null);
                showToast.success("Foto profil berhasil dihapus");
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal menghapus foto.");
        } finally {
            setIsRemoving(false);
        }
    }

    /* ── Drag & Drop handlers ── */
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
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Foto Profil</CardTitle>
                <CardDescription>
                    Upload foto profil Anda. Format yang didukung: JPG, PNG,
                    WEBP (maks 5 MB).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                    {/* Avatar preview */}
                    <div className="relative shrink-0">
                        <div className="size-32 overflow-hidden rounded-full border-4 border-muted bg-muted sm:size-40">
                            {displayImage ? (
                                <Image
                                    src={displayImage}
                                    alt="Avatar"
                                    width={160}
                                    height={160}
                                    className="size-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center bg-linear-to-br from-blue-500 to-blue-700 text-3xl font-bold text-white sm:text-4xl">
                                    {initials}
                                </div>
                            )}
                        </div>
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <Loader2 className="size-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>

                    {/* Upload zone + actions */}
                    <div className="flex flex-1 flex-col gap-4">
                        {/* Drag & Drop area */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            disabled={isUploading}
                            className={`flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm transition-colors ${isDragging
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                                } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                        >
                            {isDragging ? (
                                <>
                                    <ImageIcon className="size-8" />
                                    <span className="font-medium">
                                        Lepaskan file di sini
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload className="size-8" />
                                    <span>
                                        <span className="font-medium text-primary">
                                            Klik untuk upload
                                        </span>{" "}
                                        atau drag & drop
                                    </span>
                                    <span className="text-xs">
                                        JPG, PNG, WEBP — Maks 5 MB
                                    </span>
                                </>
                            )}
                        </button>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleInputChange}
                            className="hidden"
                        />

                        {/* Remove button — only show if has avatar */}
                        {(currentImage || preview) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-fit text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={handleRemove}
                                disabled={isRemoving}
                            >
                                {isRemoving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Trash2 className="size-4" />
                                )}
                                Hapus Foto
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
