"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    MoreHorizontal,
    Pencil,
    ShieldCheck,
    ShieldOff,
    Trash2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    UserX,
} from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserRole } from "@/db/schema";
import { ROLE_LABELS, STATUS_CONFIG } from "@/lib/teams/schemas";
import {
    toggleUserStatusAction,
    deleteUserAction,
} from "../actions";

/* ── Types ── */
interface TeamMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date | null;
    image: string | null;
    createdAt: Date;
}

type SortField = "name" | "email" | "role" | "createdAt" | "lastLoginAt" | "status";
type SortDir = "asc" | "desc";

interface TeamDataTableProps {
    data: TeamMember[];
    currentUserId: string;
    currentUserRole: UserRole;
    onEditUser: (user: TeamMember) => void;
}

/* ── Role badge color map ── */
function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" | "destructive" {
    switch (role) {
        case "super_admin":
            return "destructive";
        case "admin":
            return "default";
        case "komisaris":
            return "secondary";
        default:
            return "outline";
    }
}

/* ── Sort icon (outside component for React Compiler) ── */
function SortIcon({
    field,
    sortField,
    sortDir,
}: {
    field: SortField;
    sortField: SortField;
    sortDir: SortDir;
}) {
    if (sortField !== field)
        return (
            <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground" />
        );
    return sortDir === "asc" ? (
        <ArrowUp className="ml-1 inline size-3.5" />
    ) : (
        <ArrowDown className="ml-1 inline size-3.5" />
    );
}

/* ── Pagination config ── */
const PAGE_SIZE = 10;

export default function TeamDataTable({
    data,
    currentUserId,
    currentUserRole,
    onEditUser,
}: TeamDataTableProps) {
    // Sort state
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Pagination
    const [page, setPage] = useState(0);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toggle status loading
    const [togglingId, setTogglingId] = useState<string | null>(null);

    /* ── Sort handler ── */
    const handleSort = useCallback(
        (field: SortField) => {
            if (sortField === field) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
                setSortField(field);
                setSortDir("asc");
            }
            setPage(0);
        },
        [sortField],
    );

    /* ── Sorted data ── */
    const sorted = [...data].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortField) {
            case "name": {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB) * dir;
            }
            case "email":
                return a.email.localeCompare(b.email) * dir;
            case "role": {
                const order: Record<string, number> = { super_admin: 0, admin: 1, komisaris: 2, user: 3 };
                return ((order[a.role] ?? 4) - (order[b.role] ?? 4)) * dir;
            }
            case "createdAt":
                return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
            case "lastLoginAt": {
                const tA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
                const tB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
                return (tA - tB) * dir;
            }
            case "status":
                return (Number(a.isActive) - Number(b.isActive)) * dir;
            default:
                return 0;
        }
    });

    /* ── Paginated slice ── */
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    /* ── Toggle status ── */
    const handleToggleStatus = useCallback(
        async (user: TeamMember) => {
            if (user.id === currentUserId) {
                showToast.error("Tidak bisa mengubah status diri sendiri.");
                return;
            }
            setTogglingId(user.id);
            const result = await toggleUserStatusAction(user.id);
            setTogglingId(null);
            if (result.success) {
                showToast.success(
                    user.isActive ? "User dinonaktifkan" : "User diaktifkan",
                );
            } else {
                showToast.error(result.error);
            }
        },
        [currentUserId],
    );

    /* ── Delete user ── */
    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        const result = await deleteUserAction(deleteTarget.id);
        setIsDeleting(false);
        setDeleteTarget(null);
        if (result.success) {
            showToast.success("Anggota berhasil dihapus.");
        } else {
            showToast.error(result.error);
        }
    }, [deleteTarget]);

    /* ── Actions for a row (shared between dropdown & context) ── */
    const renderActions = (user: TeamMember, isContextMenu: boolean) => {
        const isSelf = user.id === currentUserId;
        const ItemComp = isContextMenu ? ContextMenuItem : DropdownMenuItem;
        const SepComp = isContextMenu ? ContextMenuSeparator : DropdownMenuSeparator;

        return (
            <>
                <ItemComp onClick={() => onEditUser(user)}>
                    <Pencil className="mr-2 size-3.5" />
                    Edit User
                </ItemComp>

                <ItemComp
                    onClick={() => handleToggleStatus(user)}
                    disabled={isSelf || togglingId === user.id}
                >
                    {user.isActive ? (
                        <>
                            <ShieldOff className="mr-2 size-3.5" />
                            Nonaktifkan
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="mr-2 size-3.5" />
                            Aktifkan
                        </>
                    )}
                </ItemComp>

                {currentUserRole === "super_admin" && !isSelf && (
                    <>
                        <SepComp />
                        <ItemComp
                            variant="destructive"
                            onClick={() => setDeleteTarget(user)}
                        >
                            <Trash2 className="mr-2 size-3.5" />
                            Hapus Permanen
                        </ItemComp>
                    </>
                )}
            </>
        );
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("name")}
                                    className="flex items-center font-medium"
                                >
                                    Nama
                                    <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("email")}
                                    className="flex items-center font-medium"
                                >
                                    Email
                                    <SortIcon field="email" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("role")}
                                    className="flex items-center font-medium"
                                >
                                    Role
                                    <SortIcon field="role" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("createdAt")}
                                    className="flex items-center font-medium"
                                >
                                    Bergabung
                                    <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("lastLoginAt")}
                                    className="flex items-center font-medium"
                                >
                                    Terakhir Aktif
                                    <SortIcon field="lastLoginAt" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort("status")}
                                    className="flex items-center font-medium"
                                >
                                    Status
                                    <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                                </button>
                            </TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paged.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    <UserX className="mx-auto mb-2 size-6" />
                                    Tidak ada anggota ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paged.map((user) => {
                                const initials =
                                    (user.firstName?.[0] ?? "") +
                                    (user.lastName?.[0] ?? "");
                                const statusCfg = STATUS_CONFIG[user.isActive ? "active" : "inactive"];

                                return (
                                    <ContextMenu key={user.id}>
                                        <ContextMenuTrigger asChild>
                                            <TableRow className="group cursor-default">
                                                {/* Avatar + Name */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar size="sm">
                                                            {user.image && (
                                                                <AvatarImage
                                                                    src={user.image}
                                                                    alt={`${user.firstName} ${user.lastName}`}
                                                                />
                                                            )}
                                                            <AvatarFallback>
                                                                {initials.toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">
                                                                {user.firstName} {user.lastName}
                                                            </p>
                                                            {user.id === currentUserId && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    (Anda)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Email */}
                                                <TableCell className="text-muted-foreground">
                                                    {user.email}
                                                </TableCell>

                                                {/* Role */}
                                                <TableCell>
                                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                                        {ROLE_LABELS[user.role] || user.role}
                                                    </Badge>
                                                </TableCell>

                                                {/* Joined */}
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(user.createdAt), "dd MMM yyyy", {
                                                        locale: localeId,
                                                    })}
                                                </TableCell>

                                                {/* Last Active */}
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {user.lastLoginAt
                                                        ? formatDistanceToNow(
                                                            new Date(user.lastLoginAt),
                                                            { addSuffix: true, locale: localeId },
                                                        )
                                                        : "Belum login"}
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <Badge variant={statusCfg.variant}>
                                                        {statusCfg.label}
                                                    </Badge>
                                                </TableCell>

                                                {/* Actions dropdown */}
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                                            >
                                                                <MoreHorizontal className="size-4" />
                                                                <span className="sr-only">Aksi</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                                                Aksi
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {renderActions(user, false)}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            {renderActions(user, true)}
                                        </ContextMenuContent>
                                    </ContextMenu>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        Menampilkan {page * PAGE_SIZE + 1}–
                        {Math.min((page + 1) * PAGE_SIZE, sorted.length)} dari{" "}
                        {sorted.length} anggota
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Dialog ── */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus{" "}
                            <strong>
                                {deleteTarget?.firstName} {deleteTarget?.lastName}
                            </strong>{" "}
                            ({deleteTarget?.email}) secara permanen? Tindakan ini
                            tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeleting ? "Menghapus..." : "Hapus Permanen"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
