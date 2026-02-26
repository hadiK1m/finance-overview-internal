"use client";

import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FileIcon, getFileBgColor } from "./FileIcon";
import { formatFileSize } from "@/lib/drive/schemas";
import {
    FolderOpen,
    Eye,
    Download,
    Pencil,
    FolderInput,
    Trash2,
    RotateCcw,
} from "lucide-react";
import type { DriveFolder, DriveFile } from "@/db/schema";

interface ContextActions {
    onOpen?: () => void;
    onPreview?: () => void;
    onDownload?: () => void;
    onRename?: () => void;
    onMove?: () => void;
    onTrash?: () => void;
    onRestore?: () => void;
    onPermanentDelete?: () => void;
}

interface FileGridProps {
    folders: DriveFolder[];
    files: DriveFile[];
    selectedItems: Map<string, "file" | "folder">;
    onToggleSelection: (id: string, type: "file" | "folder") => void;
    onFolderOpen: (folderId: string) => void;
    onFilePreview: (file: DriveFile) => void;
    getContextActions: (item: {
        id: string;
        name: string;
        type: "file" | "folder";
    }) => ContextActions;
    isTrashView: boolean;
}

export default function FileGrid({
    folders,
    files,
    selectedItems,
    onToggleSelection,
    onFolderOpen,
    onFilePreview,
    getContextActions,
    isTrashView,
}: FileGridProps) {
    return (
        <div className="space-y-6">
            {/* Folders section */}
            {folders.length > 0 && (
                <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Folders
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {folders.map((folder) => {
                            const isSelected = selectedItems.has(folder.id);
                            const actions = getContextActions({
                                id: folder.id,
                                name: folder.name,
                                type: "folder",
                            });

                            return (
                                <ContextMenu key={folder.id}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:bg-muted/50 hover:shadow-sm",
                                                isSelected &&
                                                "border-blue-300 bg-blue-50 ring-1 ring-blue-200",
                                            )}
                                            onDoubleClick={() => {
                                                if (!isTrashView)
                                                    onFolderOpen(folder.id);
                                            }}
                                            onClick={(e) => {
                                                if (e.ctrlKey || e.metaKey) {
                                                    onToggleSelection(
                                                        folder.id,
                                                        "folder",
                                                    );
                                                }
                                            }}
                                        >
                                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        onToggleSelection(
                                                            folder.id,
                                                            "folder",
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="size-4"
                                                />
                                            </div>
                                            <FileIcon
                                                isFolder
                                                className="size-8 shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {folder.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(
                                                        new Date(
                                                            folder.updatedAt,
                                                        ),
                                                        "dd MMM yyyy",
                                                        { locale: localeID },
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        {actions.onOpen && (
                                            <ContextMenuItem
                                                onClick={actions.onOpen}
                                            >
                                                <FolderOpen className="mr-2 size-4" />
                                                Open
                                            </ContextMenuItem>
                                        )}
                                        {actions.onRename && (
                                            <ContextMenuItem
                                                onClick={actions.onRename}
                                            >
                                                <Pencil className="mr-2 size-4" />
                                                Rename
                                            </ContextMenuItem>
                                        )}
                                        {actions.onMove && (
                                            <ContextMenuItem
                                                onClick={actions.onMove}
                                            >
                                                <FolderInput className="mr-2 size-4" />
                                                Move to...
                                            </ContextMenuItem>
                                        )}
                                        {actions.onTrash && (
                                            <>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem
                                                    onClick={actions.onTrash}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 size-4" />
                                                    Move to Trash
                                                </ContextMenuItem>
                                            </>
                                        )}
                                        {actions.onRestore && (
                                            <ContextMenuItem
                                                onClick={actions.onRestore}
                                            >
                                                <RotateCcw className="mr-2 size-4" />
                                                Restore
                                            </ContextMenuItem>
                                        )}
                                        {actions.onPermanentDelete && (
                                            <ContextMenuItem
                                                onClick={
                                                    actions.onPermanentDelete
                                                }
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Delete Permanently
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Files section */}
            {files.length > 0 && (
                <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Files
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {files.map((file) => {
                            const isSelected = selectedItems.has(file.id);
                            const actions = getContextActions({
                                id: file.id,
                                name: file.name,
                                type: "file",
                            });
                            const isImage =
                                file.mimeType.startsWith("image/");

                            return (
                                <ContextMenu key={file.id}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "group relative cursor-pointer rounded-lg border transition-all hover:bg-muted/50 hover:shadow-sm overflow-hidden",
                                                isSelected &&
                                                "border-blue-300 bg-blue-50 ring-1 ring-blue-200",
                                            )}
                                            onDoubleClick={() =>
                                                onFilePreview(file)
                                            }
                                            onClick={(e) => {
                                                if (e.ctrlKey || e.metaKey) {
                                                    onToggleSelection(
                                                        file.id,
                                                        "file",
                                                    );
                                                }
                                            }}
                                        >
                                            {/* Thumbnail area */}
                                            <div
                                                className={cn(
                                                    "flex h-28 items-center justify-center",
                                                    isImage
                                                        ? "bg-muted/30"
                                                        : getFileBgColor(
                                                            file.mimeType,
                                                        ),
                                                )}
                                            >
                                                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() =>
                                                            onToggleSelection(
                                                                file.id,
                                                                "file",
                                                            )
                                                        }
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="size-4"
                                                    />
                                                </div>
                                                {isImage ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={`/api/drive/file/${file.id}`}
                                                        alt={file.name}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <FileIcon
                                                        mimeType={
                                                            file.mimeType
                                                        }
                                                        className="size-10"
                                                    />
                                                )}
                                            </div>
                                            {/* File info */}
                                            <div className="p-2.5">
                                                <p className="truncate text-sm font-medium">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(
                                                        Number(file.size),
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        {actions.onPreview && (
                                            <ContextMenuItem
                                                onClick={actions.onPreview}
                                            >
                                                <Eye className="mr-2 size-4" />
                                                Preview
                                            </ContextMenuItem>
                                        )}
                                        {actions.onDownload && (
                                            <ContextMenuItem
                                                onClick={actions.onDownload}
                                            >
                                                <Download className="mr-2 size-4" />
                                                Download
                                            </ContextMenuItem>
                                        )}
                                        {actions.onRename && (
                                            <>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem
                                                    onClick={actions.onRename}
                                                >
                                                    <Pencil className="mr-2 size-4" />
                                                    Rename
                                                </ContextMenuItem>
                                            </>
                                        )}
                                        {actions.onMove && (
                                            <ContextMenuItem
                                                onClick={actions.onMove}
                                            >
                                                <FolderInput className="mr-2 size-4" />
                                                Move to...
                                            </ContextMenuItem>
                                        )}
                                        {actions.onTrash && (
                                            <>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem
                                                    onClick={actions.onTrash}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 size-4" />
                                                    Move to Trash
                                                </ContextMenuItem>
                                            </>
                                        )}
                                        {actions.onRestore && (
                                            <ContextMenuItem
                                                onClick={actions.onRestore}
                                            >
                                                <RotateCcw className="mr-2 size-4" />
                                                Restore
                                            </ContextMenuItem>
                                        )}
                                        {actions.onPermanentDelete && (
                                            <ContextMenuItem
                                                onClick={
                                                    actions.onPermanentDelete
                                                }
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Delete Permanently
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
