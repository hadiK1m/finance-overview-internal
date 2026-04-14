"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/show-toast";
import { FolderInput, Folder, ChevronRight, ChevronDown } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getFolderTreeAction, moveItemsAction } from "../actions";
import type { DriveItemRef, FolderNode } from "@/lib/drive/schemas";

interface MoveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: DriveItemRef[];
}

/* ── Recursive tree node type ── */
type TreeNode = FolderNode & { children: TreeNode[] };

/* ── Build tree from flat list ── */
function buildTree(
    nodes: FolderNode[],
    excludeIds: Set<string>,
): TreeNode[] {
    const map = new Map<string | null, FolderNode[]>();
    for (const n of nodes) {
        if (excludeIds.has(n.id)) continue;
        const key = n.parentId;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(n);
    }

    function expand(parentId: string | null): TreeNode[] {
        return (map.get(parentId) || []).map((n) => ({
            ...n,
            children: expand(n.id),
        }));
    }

    return expand(null);
}

/* ── Recursive tree item ── */
function TreeItem({
    node,
    depth,
    selectedId,
    onSelect,
}: {
    node: TreeNode;
    depth: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;

    return (
        <div>
            <button
                onClick={() => onSelect(node.id)}
                className={cn(
                    "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    isSelected && "bg-blue-50 text-blue-700 font-medium",
                )}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="shrink-0"
                    >
                        {expanded ? (
                            <ChevronDown className="size-3.5" />
                        ) : (
                            <ChevronRight className="size-3.5" />
                        )}
                    </button>
                ) : (
                    <span className="w-3.5" />
                )}
                <Folder className="size-4 text-blue-500 shrink-0" />
                <span className="truncate">{node.name}</span>
            </button>
            {expanded &&
                node.children.map((child) => (
                    <TreeItem
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        selectedId={selectedId}
                        onSelect={onSelect}
                    />
                ))}
        </div>
    );
}

export default function MoveDialog({
    open,
    onOpenChange,
    items,
}: MoveDialogProps) {
    const router = useRouter();
    const [folders, setFolders] = useState<FolderNode[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingTree, setLoadingTree] = useState(false);

    // Fetch folder tree when dialog opens
    useEffect(() => {
        if (open) {
            setLoadingTree(true);
            setSelectedId(null);
            getFolderTreeAction()
                .then(setFolders)
                .finally(() => setLoadingTree(false));
        }
    }, [open]);

    // Exclude folders being moved (to prevent moving into self/child)
    const excludeIds = new Set(
        items.filter((i) => i.type === "folder").map((i) => i.id),
    );

    const tree = buildTree(folders, excludeIds);

    async function handleMove() {
        setLoading(true);
        try {
            const result = await moveItemsAction(
                items.map((i) => ({ id: i.id, type: i.type })),
                selectedId,
            );
            if (result.success) {
                showToast.success("Item berhasil dipindahkan");
                onOpenChange(false);
                router.refresh();
            } else {
                showToast.error(result.error);
            }
        } catch {
            showToast.error("Gagal memindahkan item");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderInput className="size-5 text-blue-500" />
                        Move to...
                    </DialogTitle>
                    <DialogDescription>
                        Pilih folder tujuan untuk{" "}
                        {items.length === 1
                            ? `"${items[0].name}"`
                            : `${items.length} item`}
                        .
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-64 rounded-md border">
                    <div className="p-2">
                        {/* My Drive (root) */}
                        <button
                            onClick={() => setSelectedId(null)}
                            className={cn(
                                "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                                selectedId === null &&
                                "bg-blue-50 text-blue-700",
                            )}
                        >
                            <Folder className="size-4 text-blue-500" />
                            My Drive
                        </button>

                        {loadingTree ? (
                            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                Loading...
                            </p>
                        ) : (
                            tree.map((node) => (
                                <TreeItem
                                    key={node.id}
                                    node={node}
                                    depth={1}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Batal
                    </Button>
                    <Button onClick={handleMove} disabled={loading}>
                        {loading ? "Memindahkan..." : "Pindahkan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
