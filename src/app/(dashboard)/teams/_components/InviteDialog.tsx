"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Loader2 } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/db/schema";
import {
    inviteMembersSchema,
    type InviteMembersInput,
    ROLE_LABELS,
    USER_ROLES,
} from "@/lib/teams/schemas";
import { inviteMembersAction } from "../actions";

interface InviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserRole: UserRole;
}

export default function InviteDialog({
    open,
    onOpenChange,
    currentUserRole,
}: InviteDialogProps) {
    const [isPending, setIsPending] = useState(false);

    // Roles available for selection — non-super_admin cannot invite super_admin
    const availableRoles = USER_ROLES.filter((r) =>
        currentUserRole === "super_admin" ? true : r !== "super_admin",
    );

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<InviteMembersInput>({
        resolver: zodResolver(inviteMembersSchema),
        defaultValues: {
            emails: "",
            role: "user",
            message: "",
        },
    });

    // Role state for controlled Select (React Compiler: no watch())
    const [roleValue, setRoleValue] = useState<string>("user");

    const handleRoleChange = useCallback(
        (val: string) => {
            setRoleValue(val);
            setValue("role", val as UserRole);
        },
        [setValue],
    );

    const onSubmit = useCallback(
        async (data: InviteMembersInput) => {
            setIsPending(true);
            const result = await inviteMembersAction(data);
            setIsPending(false);

            if (result.success) {
                showToast.success("Undangan berhasil dikirim!");
                reset();
                setRoleValue("user");
                onOpenChange(false);
            } else {
                showToast.error(result.error);
            }
        },
        [reset, onOpenChange],
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    reset();
                    setRoleValue("user");
                }
                onOpenChange(v);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="size-5" />
                        Undang Anggota Baru
                    </DialogTitle>
                    <DialogDescription>
                        Masukkan email (pisahkan dengan koma untuk undangan
                        ganda), pilih role, dan kirim undangan.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-emails">
                            Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="invite-emails"
                            placeholder="nama@email.com, nama2@email.com"
                            {...register("emails")}
                        />
                        {errors.emails && (
                            <p className="text-xs text-destructive">
                                {errors.emails.message}
                            </p>
                        )}
                    </div>

                    {/* Role Select */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                            value={roleValue}
                            onValueChange={handleRoleChange}
                        >
                            <SelectTrigger id="invite-role">
                                <SelectValue placeholder="Pilih role" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {ROLE_LABELS[r] || r}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-xs text-destructive">
                                {errors.role.message}
                            </p>
                        )}
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-message">
                            Pesan (opsional)
                        </Label>
                        <Textarea
                            id="invite-message"
                            placeholder="Halo, kami mengundang Anda bergabung..."
                            className="resize-none"
                            rows={3}
                            {...register("message")}
                        />
                        {errors.message && (
                            <p className="text-xs text-destructive">
                                {errors.message.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Mengirim...
                                </>
                            ) : (
                                "Kirim Undangan"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
