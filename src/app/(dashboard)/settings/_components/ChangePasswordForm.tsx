"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    changePasswordSchema,
    type ChangePasswordValues,
} from "@/lib/settings/schemas";
import { changePasswordAction } from "../actions";

/** Reusable toggle button for password visibility */
function ToggleVisibility({
    visible,
    onToggle,
}: {
    visible: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            tabIndex={-1}
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
            {visible ? (
                <EyeOff className="size-4" />
            ) : (
                <Eye className="size-4" />
            )}
        </button>
    );
}

export default function ChangePasswordForm() {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [showCurrent, setShowCurrent] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ChangePasswordValues) => {
        setServerError(null);
        const result = await changePasswordAction(data);

        if (result.success) {
            showToast.success("Password berhasil diubah");
            reset();
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
        } else {
            setServerError(result.error);
            showToast.error(result.error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-5" />
                    Ubah Password
                </CardTitle>
                <CardDescription>
                    Pastikan password baru mengandung minimal 8 karakter, 1
                    huruf besar, 1 angka, dan 1 simbol.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Server error banner */}
                    {serverError && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {/* Current password */}
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                            Password Saat Ini
                        </Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrent ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10"
                                {...register("currentPassword")}
                            />
                            <ToggleVisibility
                                visible={showCurrent}
                                onToggle={() => setShowCurrent((v) => !v)}
                            />
                        </div>
                        {errors.currentPassword && (
                            <p className="text-xs text-destructive">
                                {errors.currentPassword.message}
                            </p>
                        )}
                    </div>

                    {/* New password */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Password Baru</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNew ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10"
                                {...register("newPassword")}
                            />
                            <ToggleVisibility
                                visible={showNew}
                                onToggle={() => setShowNew((v) => !v)}
                            />
                        </div>
                        {errors.newPassword && (
                            <p className="text-xs text-destructive">
                                {errors.newPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Confirm new password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                            Konfirmasi Password Baru
                        </Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirm ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10"
                                {...register("confirmPassword")}
                            />
                            <ToggleVisibility
                                visible={showConfirm}
                                onToggle={() => setShowConfirm((v) => !v)}
                            />
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-xs text-destructive">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Mengubah…
                                </>
                            ) : (
                                "Ubah Password"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
