"use client";

import { useState, useCallback } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/drive/schemas";
import type { DriveFile } from "@/db/schema";

interface PreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: DriveFile;
}

export default function PreviewModal({
    open,
    onOpenChange,
    file,
}: PreviewModalProps) {
    const fileUrl = `/api/drive/file/${file.id}`;
    const downloadUrl = `${fileUrl}?download=true`;
    const [textContent, setTextContent] = useState<string | null>(null);
    const [zoom, setZoom] = useState(100);
    const [textLoaded, setTextLoaded] = useState(false);

    const isImage = file.mimeType.startsWith("image/");
    const isVideo = file.mimeType.startsWith("video/");
    const isAudio = file.mimeType.startsWith("audio/");
    const isPdf = file.mimeType === "application/pdf";
    const isText =
        file.mimeType.startsWith("text/") ||
        file.mimeType === "application/json" ||
        file.mimeType === "application/javascript" ||
        file.mimeType === "application/xml";

    // Fetch text content lazily on first render (using key prop reset)
    const textRef = useCallback(
        (node: HTMLPreElement | null) => {
            if (node && isText && !textLoaded) {
                setTextLoaded(true);
                fetch(fileUrl)
                    .then((res) => res.text())
                    .then(setTextContent)
                    .catch(() => setTextContent("Error loading file content."));
            }
        },
        [isText, textLoaded, fileUrl],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="truncate text-sm font-semibold">
                            {file.name}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            {file.mimeType} ·{" "}
                            {formatFileSize(Number(file.size))}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                        {isImage && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                        setZoom((z) => Math.max(25, z - 25))
                                    }
                                >
                                    <ZoomOut className="size-4" />
                                </Button>
                                <span className="text-xs w-10 text-center tabular-nums">
                                    {zoom}%
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                        setZoom((z) => Math.min(300, z + 25))
                                    }
                                >
                                    <ZoomIn className="size-4" />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            asChild
                        >
                            <a href={downloadUrl} download>
                                <Download className="size-4" />
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center min-h-80">
                    {isImage && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={fileUrl}
                            alt={file.name}
                            className="max-w-full object-contain transition-transform"
                            style={{
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: "center",
                            }}
                        />
                    )}

                    {isVideo && (
                        <video
                            src={fileUrl}
                            controls
                            className="max-h-full max-w-full"
                        >
                            Your browser does not support the video tag.
                        </video>
                    )}

                    {isAudio && (
                        <div className="p-8">
                            <audio src={fileUrl} controls className="w-80">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}

                    {isPdf && (
                        <iframe
                            src={fileUrl}
                            className="h-full w-full min-h-[60vh]"
                            title={file.name}
                        />
                    )}

                    {isText && (
                        <pre
                            ref={textRef}
                            className="w-full h-full overflow-auto p-4 text-sm font-mono whitespace-pre-wrap"
                        >
                            {textContent === null
                                ? "Loading..."
                                : textContent}
                        </pre>
                    )}

                    {!isImage &&
                        !isVideo &&
                        !isAudio &&
                        !isPdf &&
                        !isText && (
                            <div className="flex flex-col items-center gap-4 p-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Preview tidak tersedia untuk tipe file ini.
                                </p>
                                <Button asChild>
                                    <a href={downloadUrl} download>
                                        <Download className="mr-2 size-4" />
                                        Download File
                                    </a>
                                </Button>
                            </div>
                        )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
