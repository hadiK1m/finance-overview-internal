"use client";

import { useCallback, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MailX, Trash2, Clock, Inbox } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/db/schema";
import { ROLE_LABELS, INVITE_STATUS_CONFIG } from "@/lib/teams/schemas";
import { revokeInviteAction, deleteInviteAction } from "../actions";

/* ── Types ── */
interface PendingInvite {
    id: string;
    email: string;
    role: UserRole;
    status: string;
    message: string | null;
    expiresAt: Date;
    createdAt: Date;
}

interface InvitesTableProps {
    data: PendingInvite[];
}

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

export default function InvitesTable({ data }: InvitesTableProps) {
    const [revoking, setRevoking] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PendingInvite | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRevoke = useCallback(async (invite: PendingInvite) => {
        setRevoking(invite.id);
        const result = await revokeInviteAction(invite.id);
        setRevoking(null);
        if (result.success) {
            showToast.success("Undangan berhasil dibatalkan.");
        } else {
            showToast.error(result.error);
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        const result = await deleteInviteAction(deleteTarget.id);
        setIsDeleting(false);
        setDeleteTarget(null);
        if (result.success) {
            showToast.success("Undangan berhasil dihapus.");
        } else {
            showToast.error(result.error);
        }
    }, [deleteTarget]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-md border py-16 text-muted-foreground">
                <Inbox className="mb-2 size-8" />
                <p className="text-sm">Tidak ada undangan pending.</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Dikirim</TableHead>
                            <TableHead>Kedaluwarsa</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((invite) => {
                            const statusCfg =
                                INVITE_STATUS_CONFIG[invite.status] ??
                                INVITE_STATUS_CONFIG.pending;
                            const isExpired =
                                new Date(invite.expiresAt) < new Date();

                            return (
                                <TableRow key={invite.id}>
                                    <TableCell className="font-medium">
                                        {invite.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                                            {ROLE_LABELS[invite.role] || invite.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={isExpired ? "secondary" : statusCfg.variant}>
                                            {isExpired ? "Expired" : statusCfg.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(
                                            new Date(invite.createdAt),
                                            "dd MMM yyyy",
                                            { locale: localeId },
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span
                                                        className={
                                                            isExpired
                                                                ? "text-destructive"
                                                                : "text-muted-foreground"
                                                        }
                                                    >
                                                        <Clock className="mr-1 inline size-3.5" />
                                                        {formatDistanceToNow(
                                                            new Date(invite.expiresAt),
                                                            {
                                                                addSuffix: true,
                                                                locale: localeId,
                                                            },
                                                        )}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {format(
                                                        new Date(invite.expiresAt),
                                                        "dd MMM yyyy HH:mm",
                                                        { locale: localeId },
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            disabled={
                                                                revoking === invite.id ||
                                                                isExpired
                                                            }
                                                            onClick={() =>
                                                                handleRevoke(invite)
                                                            }
                                                        >
                                                            <MailX className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Batalkan Undangan
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive hover:text-destructive"
                                                            onClick={() =>
                                                                setDeleteTarget(invite)
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Hapus Undangan
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Undangan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus undangan untuk{" "}
                            <strong>{deleteTarget?.email}</strong>? Tindakan ini
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
                            {isDeleting ? "Menghapus..." : "Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
