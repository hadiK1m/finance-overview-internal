"use client";

import {
    HardDrive,
    Clock,
    Trash2,
    Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/drive/schemas";

/* ── Constants ── */
const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB

const SIDEBAR_ITEMS = [
    { view: "my-drive", label: "My Drive", icon: HardDrive },
    { view: "recent", label: "Recent", icon: Clock },
    { view: "trash", label: "Trash", icon: Trash2 },
] as const;

interface DriveSidebarProps {
    currentView: string;
    storageUsed: number;
    onNavigateView: (view: string) => void;
}

export default function DriveSidebar({
    currentView,
    storageUsed,
    onNavigateView,
}: DriveSidebarProps) {
    const usagePercent = Math.min(
        (storageUsed / STORAGE_LIMIT) * 100,
        100,
    );

    return (
        <nav className="flex flex-col gap-1">
            {SIDEBAR_ITEMS.map(({ view, label, icon: Icon }) => {
                const isActive =
                    currentView === view ||
                    (view === "my-drive" &&
                        currentView !== "recent" &&
                        currentView !== "trash");

                return (
                    <Button
                        key={view}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                            "justify-start gap-3 font-medium",
                            isActive && "bg-blue-50 text-blue-700 hover:bg-blue-100",
                        )}
                        onClick={() => onNavigateView(view)}
                    >
                        <Icon className="size-4" />
                        {label}
                    </Button>
                );
            })}

            {/* Storage usage */}
            <div className="mt-6 space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Database className="size-3.5" />
                    Storage
                </div>
                <Progress value={usagePercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                    {formatFileSize(storageUsed)} of{" "}
                    {formatFileSize(STORAGE_LIMIT)} used
                </p>
            </div>
        </nav>
    );
}
