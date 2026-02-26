"use client";

import {
    ChevronRight,
    LayoutGrid,
    List,
    FolderPlus,
    Upload,
    Search,
    Trash2,
    X,
    Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BreadcrumbItem } from "@/lib/drive/schemas";

interface DriveToolbarProps {
    breadcrumbs: BreadcrumbItem[];
    viewMode: "grid" | "list";
    searchQuery: string;
    currentView: string;
    selectedCount: number;
    isTrashView: boolean;
    onViewModeChange: (mode: "grid" | "list") => void;
    onSearchChange: (query: string) => void;
    onCreateFolder: () => void;
    onUploadClick: () => void;
    onNavigateToFolder: (folderId: string | null) => void;
    onTrashSelected: () => void;
    onEmptyTrash: () => void;
    onMobileSidebarToggle: () => void;
}

export default function DriveToolbar({
    breadcrumbs,
    viewMode,
    searchQuery,
    currentView,
    selectedCount,
    isTrashView,
    onViewModeChange,
    onSearchChange,
    onCreateFolder,
    onUploadClick,
    onNavigateToFolder,
    onTrashSelected,
    onEmptyTrash,
    onMobileSidebarToggle,
}: DriveToolbarProps) {
    return (
        <div className="space-y-3">
            {/* Row 1: Breadcrumbs + Actions */}
            <div className="flex items-center gap-2">
                {/* Mobile sidebar toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                    onClick={onMobileSidebarToggle}
                >
                    <Menu className="size-4" />
                </Button>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 overflow-x-auto text-sm min-w-0 flex-1">
                    {currentView === "trash" ? (
                        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Trash2 className="size-4" />
                            Trash
                        </span>
                    ) : currentView === "recent" ? (
                        <span className="font-medium text-muted-foreground">
                            Recent
                        </span>
                    ) : (
                        breadcrumbs.map((crumb, idx) => (
                            <span
                                key={crumb.id ?? "root"}
                                className="flex items-center gap-1 shrink-0"
                            >
                                {idx > 0 && (
                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                )}
                                <button
                                    onClick={() =>
                                        onNavigateToFolder(crumb.id)
                                    }
                                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-sm transition-colors hover:bg-muted ${idx === breadcrumbs.length - 1
                                            ? "font-semibold text-foreground"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {crumb.name}
                                </button>
                            </span>
                        ))
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                    {!isTrashView && currentView !== "recent" && (
                        <>
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={onUploadClick}
                                        >
                                            <Upload className="size-3.5" />
                                            <span className="hidden sm:inline">
                                                Upload
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Upload files</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={onCreateFolder}
                                        >
                                            <FolderPlus className="size-3.5" />
                                            <span className="hidden sm:inline">
                                                New Folder
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Create new folder
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    )}

                    {isTrashView && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={onEmptyTrash}
                        >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">
                                Empty Trash
                            </span>
                        </Button>
                    )}

                    {selectedCount > 0 && !isTrashView && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={onTrashSelected}
                        >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">
                                Delete ({selectedCount})
                            </span>
                        </Button>
                    )}
                </div>
            </div>

            <Separator />

            {/* Row 2: Search + View Toggle */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search files & folders..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-8 pl-8 pr-8 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center rounded-md border">
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        className="size-8 rounded-r-none"
                        onClick={() => onViewModeChange("grid")}
                    >
                        <LayoutGrid className="size-3.5" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className="size-8 rounded-l-none"
                        onClick={() => onViewModeChange("list")}
                    >
                        <List className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
