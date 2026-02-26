"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    updateProfileSchema,
    type UpdateProfileValues,
} from "@/lib/settings/schemas";
import { updateProfileAction } from "../actions";

interface ProfileFormProps {
    defaultValues: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        bio: string | null;
    };
}

export default function ProfileForm({ defaultValues }: ProfileFormProps) {
    const [serverError, setServerError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateProfileValues>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            firstName: defaultValues.firstName,
            lastName: defaultValues.lastName,
            phone: defaultValues.phone ?? "",
            bio: defaultValues.bio ?? "",
        },
    });

    const onSubmit = async (data: UpdateProfileValues) => {
        setServerError(null);
        const result = await updateProfileAction(data);

        if (result.success) {
            showToast.success("Profil berhasil diperbarui");
        } else {
            setServerError(result.error);
            showToast.error(result.error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>
                    Perbarui nama, nomor telepon, dan bio Anda.
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

                    {/* Name row */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Nama Depan</Label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                {...register("firstName")}
                            />
                            {errors.firstName && (
                                <p className="text-xs text-destructive">
                                    {errors.firstName.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Nama Belakang</Label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                {...register("lastName")}
                            />
                            {errors.lastName && (
                                <p className="text-xs text-destructive">
                                    {errors.lastName.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Email (readonly) */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            defaultValue={defaultValues.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email tidak dapat diubah.
                        </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">
                            Nomor Telepon{" "}
                            <span className="text-muted-foreground">
                                (opsional)
                            </span>
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+62 812-3456-7890"
                            {...register("phone")}
                        />
                        {errors.phone && (
                            <p className="text-xs text-destructive">
                                {errors.phone.message}
                            </p>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <Label htmlFor="bio">
                            Bio{" "}
                            <span className="text-muted-foreground">
                                (opsional)
                            </span>
                        </Label>
                        <Textarea
                            id="bio"
                            placeholder="Ceritakan sedikit tentang Anda..."
                            rows={3}
                            className="resize-none"
                            {...register("bio")}
                        />
                        {errors.bio && (
                            <p className="text-xs text-destructive">
                                {errors.bio.message}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Menyimpan…
                                </>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
