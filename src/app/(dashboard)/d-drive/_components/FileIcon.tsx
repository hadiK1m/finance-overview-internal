import {
    Folder,
    FileText,
    Image as ImageIcon,
    Film,
    Music,
    Archive,
    FileSpreadsheet,
    Presentation,
    File,
    Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Mime-type → icon + color mapping ── */
const ICON_MAP: Record<string, { icon: typeof File; color: string }> = {
    image: { icon: ImageIcon, color: "text-blue-500" },
    video: { icon: Film, color: "text-purple-500" },
    audio: { icon: Music, color: "text-orange-500" },
    "application/pdf": { icon: FileText, color: "text-red-500" },
    "application/zip": { icon: Archive, color: "text-yellow-600" },
    "application/x-rar-compressed": { icon: Archive, color: "text-yellow-600" },
    "application/gzip": { icon: Archive, color: "text-yellow-600" },
    "text/csv": { icon: FileSpreadsheet, color: "text-green-600" },
    "application/vnd.ms-excel": {
        icon: FileSpreadsheet,
        color: "text-green-600",
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        icon: FileSpreadsheet,
        color: "text-green-600",
    },
    "application/vnd.ms-powerpoint": {
        icon: Presentation,
        color: "text-orange-500",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        { icon: Presentation, color: "text-orange-500" },
    "text/html": { icon: Code, color: "text-orange-600" },
    "application/javascript": { icon: Code, color: "text-yellow-500" },
    "application/json": { icon: Code, color: "text-yellow-500" },
    text: { icon: FileText, color: "text-gray-500" },
};

function getFileIconData(mimeType: string) {
    if (ICON_MAP[mimeType]) return ICON_MAP[mimeType];
    const prefix = mimeType.split("/")[0];
    if (ICON_MAP[prefix]) return ICON_MAP[prefix];
    return { icon: File, color: "text-gray-400" };
}

export function FileIcon({
    mimeType,
    isFolder,
    className,
}: {
    mimeType?: string;
    isFolder?: boolean;
    className?: string;
}) {
    if (isFolder) {
        return <Folder className={cn("text-blue-500", className)} />;
    }
    const { icon: Icon, color } = getFileIconData(mimeType || "");
    return <Icon className={cn(color, className)} />;
}

/** Thumbnail background colors by category */
export function getFileBgColor(mimeType: string): string {
    if (mimeType.startsWith("image")) return "bg-blue-50";
    if (mimeType.startsWith("video")) return "bg-purple-50";
    if (mimeType.startsWith("audio")) return "bg-orange-50";
    if (mimeType.includes("pdf")) return "bg-red-50";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
        return "bg-green-50";
    return "bg-gray-50";
}
