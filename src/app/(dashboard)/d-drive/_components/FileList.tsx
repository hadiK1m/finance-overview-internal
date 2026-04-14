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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
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

interface FileListProps {
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

function ContextMenuItems({ actions }: { actions: ContextActions }) {
    return (
        <ContextMenuContent>
            {actions.onOpen && (
                <ContextMenuItem onClick={actions.onOpen}>
                    <FolderOpen className="mr-2 size-4" />
                    Open
                </ContextMenuItem>
            )}
            {actions.onPreview && (
                <ContextMenuItem onClick={actions.onPreview}>
                    <Eye className="mr-2 size-4" />
                    Preview
                </ContextMenuItem>
            )}
            {actions.onDownload && (
                <ContextMenuItem onClick={actions.onDownload}>
                    <Download className="mr-2 size-4" />
                    Download
                </ContextMenuItem>
            )}
            {(actions.onRename || actions.onMove) && <ContextMenuSeparator />}
            {actions.onRename && (
                <ContextMenuItem onClick={actions.onRename}>
                    <Pencil className="mr-2 size-4" />
                    Rename
                </ContextMenuItem>
            )}
            {actions.onMove && (
                <ContextMenuItem onClick={actions.onMove}>
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
                <ContextMenuItem onClick={actions.onRestore}>
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                </ContextMenuItem>
            )}
            {actions.onPermanentDelete && (
                <ContextMenuItem
                    onClick={actions.onPermanentDelete}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 size-4" />
                    Delete Permanently
                </ContextMenuItem>
            )}
        </ContextMenuContent>
    );
}

export default function FileList({
    folders,
    files,
    selectedItems,
    onToggleSelection,
    onFolderOpen,
    onFilePreview,
    getContextActions,
    isTrashView,
}: FileListProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
                    <TableHead className="w-32">Modified</TableHead>
                    <TableHead className="w-24 text-right">Size</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {/* Folders */}
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
                                <TableRow
                                    className={cn(
                                        "cursor-pointer",
                                        isSelected && "bg-blue-50",
                                    )}
                                    onDoubleClick={() => {
                                        if (!isTrashView)
                                            onFolderOpen(folder.id);
                                    }}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                                onToggleSelection(
                                                    folder.id,
                                                    "folder",
                                                )
                                            }
                                            className="size-4"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <FileIcon
                                                isFolder
                                                className="size-5 shrink-0"
                                            />
                                            <span className="truncate font-medium">
                                                {folder.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(
                                            new Date(folder.updatedAt),
                                            "dd MMM yyyy",
                                            { locale: localeID },
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">
                                        —
                                    </TableCell>
                                </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuItems actions={actions} />
                        </ContextMenu>
                    );
                })}

                {/* Files */}
                {files.map((file) => {
                    const isSelected = selectedItems.has(file.id);
                    const actions = getContextActions({
                        id: file.id,
                        name: file.name,
                        type: "file",
                    });

                    return (
                        <ContextMenu key={file.id}>
                            <ContextMenuTrigger asChild>
                                <TableRow
                                    className={cn(
                                        "cursor-pointer",
                                        isSelected && "bg-blue-50",
                                    )}
                                    onDoubleClick={() => onFilePreview(file)}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                                onToggleSelection(
                                                    file.id,
                                                    "file",
                                                )
                                            }
                                            className="size-4"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <FileIcon
                                                mimeType={file.mimeType}
                                                className="size-5 shrink-0"
                                            />
                                            <span className="truncate font-medium">
                                                {file.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(
                                            new Date(file.updatedAt),
                                            "dd MMM yyyy",
                                            { locale: localeID },
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                        {formatFileSize(Number(file.size))}
                                    </TableCell>
                                </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuItems actions={actions} />
                        </ContextMenu>
                    );
                })}

                {/* Empty state */}
                {folders.length === 0 && files.length === 0 && (
                    <TableRow>
                        <TableCell
                            colSpan={4}
                            className="h-40 text-center text-muted-foreground"
                        >
                            No items found
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
