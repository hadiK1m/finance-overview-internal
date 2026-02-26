"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/show-toast";
import { FolderOpen, FileX, Trash2, Upload, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import DriveSidebar from "./DriveSidebar";
import DriveToolbar from "./DriveToolbar";
import FileGrid from "./FileGrid";
import FileList from "./FileList";
import CreateFolderDialog from "./CreateFolderDialog";
import RenameDialog from "./RenameDialog";
import MoveDialog from "./MoveDialog";
import PreviewModal from "./PreviewModal";
import {
    uploadFilesAction,
    trashItemsAction,
    permanentDeleteItemsAction,
    restoreItemsAction,
    emptyTrashAction,
} from "../actions";
import type { DriveFolder, DriveFile } from "@/db/schema";
import type { BreadcrumbItem, DriveItemRef } from "@/lib/drive/schemas";

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */

interface DriveClientProps {
    folders: DriveFolder[];
    files: DriveFile[];
    breadcrumbs: BreadcrumbItem[];
    currentFolderId: string | null;
    currentView: string;
    storageUsed: number;
    searchQuery: string;
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function DriveClient({
    folders,
    files,
    breadcrumbs,
    currentFolderId,
    currentView,
    storageUsed,
    searchQuery: initialQuery,
}: DriveClientProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── View state ── */
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    /* ── Selection ── */
    const [selectedItems, setSelectedItems] = useState<
        Map<string, "file" | "folder">
    >(new Map());

    /* ── Upload state ── */
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    /* ── Dialog state ── */
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<DriveItemRef | null>(null);
    const [moveTargets, setMoveTargets] = useState<DriveItemRef[]>([]);
    const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

    const isTrashView = currentView === "trash";
    const isRecentView = currentView === "recent";

    /* ── Filter by search ── */
    const filteredFolders = searchQuery
        ? folders.filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        : folders;
    const filteredFiles = searchQuery
        ? files.filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        : files;

    /* ── Navigation ── */
    function navigateToFolder(folderId: string | null) {
        const url = folderId ? `/d-drive?folderId=${folderId}` : "/d-drive";
        router.push(url);
        setSelectedItems(new Map());
    }

    function navigateToView(view: string) {
        if (view === "my-drive") {
            router.push("/d-drive");
        } else {
            router.push(`/d-drive?view=${view}`);
        }
        setSelectedItems(new Map());
        setMobileSidebarOpen(false);
    }

    /* ── Upload ── */
    async function handleUpload(fileList: FileList | File[]) {
        const filesToUpload = Array.from(fileList);
        if (!filesToUpload.length) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            if (currentFolderId) formData.append("folderId", currentFolderId);
            for (const file of filesToUpload) {
                formData.append("files", file);
            }

            const result = await uploadFilesAction(formData);
            if (result.success) {
                showToast.success(
                    `${filesToUpload.length} file berhasil diupload`,
                );
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal mengupload file");
        } finally {
            setIsUploading(false);
        }
    }

    /* ── Trash ── */
    async function handleTrash(items: DriveItemRef[]) {
        try {
            const result = await trashItemsAction(
                items.map((i) => ({ id: i.id, type: i.type })),
            );
            if (result.success) {
                showToast.success("Dipindahkan ke Trash");
                setSelectedItems(new Map());
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal menghapus item");
        }
    }

    /* ── Permanent delete ── */
    async function handlePermanentDelete(items: DriveItemRef[]) {
        try {
            const result = await permanentDeleteItemsAction(
                items.map((i) => ({ id: i.id, type: i.type })),
            );
            if (result.success) {
                showToast.success("Dihapus permanen");
                setSelectedItems(new Map());
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal menghapus item");
        }
    }

    /* ── Restore ── */
    async function handleRestore(items: DriveItemRef[]) {
        try {
            const result = await restoreItemsAction(
                items.map((i) => ({ id: i.id, type: i.type })),
            );
            if (result.success) {
                showToast.success("Item dipulihkan");
                setSelectedItems(new Map());
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal memulihkan item");
        }
    }

    /* ── Empty trash ── */
    async function handleEmptyTrash() {
        try {
            const result = await emptyTrashAction();
            if (result.success) {
                showToast.success("Trash dikosongkan");
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal mengosongkan trash");
        }
    }

    /* ── Selection toggle ── */
    function toggleSelection(id: string, type: "file" | "folder") {
        setSelectedItems((prev) => {
            const next = new Map(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.set(id, type);
            }
            return next;
        });
    }

    /* ── Context menu actions builder ── */
    function getContextActions(item: DriveItemRef) {
        if (isTrashView) {
            return {
                onRestore: () => handleRestore([item]),
                onPermanentDelete: () => handlePermanentDelete([item]),
            };
        }

        return {
            onOpen:
                item.type === "folder"
                    ? () => navigateToFolder(item.id)
                    : undefined,
            onPreview:
                item.type === "file"
                    ? () => {
                        const file = files.find((f) => f.id === item.id);
                        if (file) setPreviewFile(file);
                    }
                    : undefined,
            onDownload:
                item.type === "file"
                    ? () => {
                        window.open(
                            `/api/drive/file/${item.id}?download=true`,
                            "_blank",
                        );
                    }
                    : undefined,
            onRename: () => setRenameTarget(item),
            onMove: () => setMoveTargets([item]),
            onTrash: () => handleTrash([item]),
        };
    }

    /* ── Drag & drop handlers ── */
    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (
            e.dataTransfer.types.includes("Files") &&
            !isTrashView &&
            !isRecentView
        ) {
            setIsDragOver(true);
        }
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    }

    /* ═══════════════════════════════════════
       Render
       ═══════════════════════════════════════ */

    const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

    return (
        <div
            className="relative flex min-h-[60vh]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden w-52 shrink-0 border-r pr-4 md:block">
                <DriveSidebar
                    currentView={currentView}
                    storageUsed={storageUsed}
                    onNavigateView={navigateToView}
                />
            </aside>

            {/* ── Mobile Sidebar (Sheet) ── */}
            <Sheet
                open={mobileSidebarOpen}
                onOpenChange={setMobileSidebarOpen}
            >
                <SheetContent side="left" className="w-64 pt-10">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <DriveSidebar
                        currentView={currentView}
                        storageUsed={storageUsed}
                        onNavigateView={navigateToView}
                    />
                </SheetContent>
            </Sheet>

            {/* ── Main Content ── */}
            <div className="flex flex-1 flex-col min-w-0 md:pl-6">
                <DriveToolbar
                    breadcrumbs={breadcrumbs}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                    currentView={currentView}
                    selectedCount={selectedItems.size}
                    isTrashView={isTrashView}
                    onViewModeChange={setViewMode}
                    onSearchChange={setSearchQuery}
                    onCreateFolder={() => setCreateFolderOpen(true)}
                    onUploadClick={() => fileInputRef.current?.click()}
                    onNavigateToFolder={navigateToFolder}
                    onTrashSelected={() => {
                        const items = Array.from(selectedItems).map(
                            ([id, type]) => ({
                                id,
                                name: "",
                                type,
                            }),
                        );
                        handleTrash(items);
                    }}
                    onEmptyTrash={handleEmptyTrash}
                    onMobileSidebarToggle={() => setMobileSidebarOpen(true)}
                />

                <div className="mt-4 flex-1">
                    {isEmpty ? (
                        /* ── Empty State ── */
                        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                            {isTrashView ? (
                                <>
                                    <Trash2 className="size-16 text-muted-foreground/30" />
                                    <p className="text-muted-foreground">
                                        Trash kosong
                                    </p>
                                </>
                            ) : searchQuery ? (
                                <>
                                    <FileX className="size-16 text-muted-foreground/30" />
                                    <p className="text-muted-foreground">
                                        Tidak ada hasil untuk &quot;{searchQuery}
                                        &quot;
                                    </p>
                                </>
                            ) : (
                                <>
                                    <FolderOpen className="size-16 text-muted-foreground/30" />
                                    <p className="text-muted-foreground">
                                        Folder ini kosong
                                    </p>
                                    {!isRecentView && (
                                        <p className="text-xs text-muted-foreground">
                                            Drop file di sini atau klik Upload
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : viewMode === "grid" ? (
                        <FileGrid
                            folders={filteredFolders}
                            files={filteredFiles}
                            selectedItems={selectedItems}
                            onToggleSelection={toggleSelection}
                            onFolderOpen={navigateToFolder}
                            onFilePreview={(file) => setPreviewFile(file)}
                            getContextActions={getContextActions}
                            isTrashView={isTrashView}
                        />
                    ) : (
                        <FileList
                            folders={filteredFolders}
                            files={filteredFiles}
                            selectedItems={selectedItems}
                            onToggleSelection={toggleSelection}
                            onFolderOpen={navigateToFolder}
                            onFilePreview={(file) => setPreviewFile(file)}
                            getContextActions={getContextActions}
                            isTrashView={isTrashView}
                        />
                    )}
                </div>
            </div>

            {/* ── Hidden file input ── */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) handleUpload(e.target.files);
                    e.target.value = "";
                }}
            />

            {/* ── Drag overlay ── */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-blue-500/5 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-400 bg-white p-10 shadow-lg">
                        <Upload className="size-10 text-blue-500" />
                        <p className="text-base font-medium text-blue-600">
                            Drop files here to upload
                        </p>
                    </div>
                </div>
            )}

            {/* ── Upload spinner overlay ── */}
            {isUploading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-lg border">
                        <Loader2 className="size-8 animate-spin text-blue-500" />
                        <p className="text-sm font-medium">
                            Mengupload file...
                        </p>
                    </div>
                </div>
            )}

            {/* ── Dialogs ── */}
            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                parentId={currentFolderId}
            />

            {renameTarget && (
                <RenameDialog
                    key={renameTarget.id}
                    open={!!renameTarget}
                    onOpenChange={(open) => !open && setRenameTarget(null)}
                    item={renameTarget}
                />
            )}

            {moveTargets.length > 0 && (
                <MoveDialog
                    open={moveTargets.length > 0}
                    onOpenChange={(open) => !open && setMoveTargets([])}
                    items={moveTargets}
                />
            )}

            {previewFile && (
                <PreviewModal
                    key={previewFile.id}
                    open={!!previewFile}
                    onOpenChange={(open) => !open && setPreviewFile(null)}
                    file={previewFile}
                />
            )}
        </div>
    );
}
