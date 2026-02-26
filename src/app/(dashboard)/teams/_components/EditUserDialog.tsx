"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/db/schema";
import {
    editUserSchema,
    type EditUserInput,
    ROLE_LABELS,
    USER_ROLES,
} from "@/lib/teams/schemas";
import { editUserAction } from "../actions";

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

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: TeamMember;
    currentUserRole: UserRole;
}

export default function EditUserDialog({
    open,
    onOpenChange,
    user,
    currentUserRole,
}: EditUserDialogProps) {
    const [isPending, setIsPending] = useState(false);

    // Roles available — non-super_admin cannot set super_admin
    const availableRoles = USER_ROLES.filter((r) =>
        currentUserRole === "super_admin" ? true : r !== "super_admin",
    );

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<EditUserInput>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
        },
    });

    // Controlled state for Select and Switch (React Compiler: no watch())
    const [roleValue, setRoleValue] = useState<string>(user.role);
    const [isActive, setIsActive] = useState(user.isActive);

    // Sync when user prop changes (different user selected)
    const resetToUser = useCallback(() => {
        reset({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
        });
        setRoleValue(user.role);
        setIsActive(user.isActive);
    }, [user, reset]);

    // Reset form when dialog opens with a new user
    // Using a ref-based approach to avoid useEffect + setState (React Compiler)
    const [lastUserId, setLastUserId] = useState(user.id);
    if (user.id !== lastUserId) {
        setLastUserId(user.id);
        resetToUser();
    }

    const handleRoleChange = useCallback(
        (val: string) => {
            setRoleValue(val);
            setValue("role", val as UserRole);
        },
        [setValue],
    );

    const handleActiveChange = useCallback(
        (val: boolean) => {
            setIsActive(val);
            setValue("isActive", val);
        },
        [setValue],
    );

    const onSubmit = useCallback(
        async (data: EditUserInput) => {
            setIsPending(true);
            const result = await editUserAction(data);
            setIsPending(false);

            if (result.success) {
                showToast.success("Data anggota berhasil diperbarui!");
                onOpenChange(false);
            } else {
                showToast.error(result.error);
            }
        },
        [onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5" />
                        Edit Anggota
                    </DialogTitle>
                    <DialogDescription>
                        Ubah informasi, role, atau status untuk{" "}
                        <strong>{user.email}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    {/* Hidden ID */}
                    <input type="hidden" {...register("id")} />

                    {/* Email (read-only display) */}
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user.email} disabled className="bg-muted" />
                    </div>

                    {/* First Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-firstName">
                            Nama Depan{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="edit-firstName"
                            {...register("firstName")}
                        />
                        {errors.firstName && (
                            <p className="text-xs text-destructive">
                                {errors.firstName.message}
                            </p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-lastName">
                            Nama Belakang{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="edit-lastName"
                            {...register("lastName")}
                        />
                        {errors.lastName && (
                            <p className="text-xs text-destructive">
                                {errors.lastName.message}
                            </p>
                        )}
                    </div>

                    {/* Role Select */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-role">Role</Label>
                        <Select
                            value={roleValue}
                            onValueChange={handleRoleChange}
                        >
                            <SelectTrigger id="edit-role">
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

                    {/* Active Status */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <Label htmlFor="edit-isActive" className="text-sm font-medium">
                                Status Akun
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {isActive
                                    ? "Akun aktif dan dapat mengakses sistem"
                                    : "Akun dinonaktifkan, tidak bisa login"}
                            </p>
                        </div>
                        <Switch
                            id="edit-isActive"
                            checked={isActive}
                            onCheckedChange={handleActiveChange}
                        />
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
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
