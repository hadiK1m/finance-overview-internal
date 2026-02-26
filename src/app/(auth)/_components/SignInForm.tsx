"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/show-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema, type SignInValues } from "@/lib/auth/schemas";
import { signInAction } from "../actions";

export default function SignInForm() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: SignInValues) => {
        setServerError(null);

        // Server action will redirect on success (never returns).
        // Only error responses reach this point.
        const result = await signInAction(data);

        if (!result.success) {
            setServerError(result.error);
            showToast.error(result.error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Server error ── */}
            {serverError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{serverError}</span>
                </div>
            )}

            {/* ── Email ── */}
            <div className="group relative space-y-1.5">
                <Label
                    htmlFor="email"
                    className="text-xs text-muted-foreground group-focus-within:text-[#14a2ba] transition-colors"
                >
                    Email
                </Label>
                <div className="relative">
                    <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@pln.co.id"
                        className="h-11 rounded-xl border-[#14a2ba]/15 bg-[#125d72]/10 pr-10 text-sm text-white placeholder:text-muted-foreground/60 focus-visible:border-[#14a2ba] focus-visible:ring-[#14a2ba]/25"
                        {...register("email")}
                    />
                    <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                </div>
                {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
            </div>

            {/* ── Password ── */}
            <div className="group relative space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label
                        htmlFor="password"
                        className="text-xs text-muted-foreground group-focus-within:text-[#14a2ba] transition-colors"
                    >
                        Password
                    </Label>
                    <a
                        href="#"
                        className="text-xs text-[#14a2ba] transition-colors hover:text-[#e7f6f9] hover:underline"
                    >
                        Forgot password?
                    </a>
                </div>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 rounded-xl border-[#14a2ba]/15 bg-[#125d72]/10 pr-10 text-sm text-white placeholder:text-muted-foreground/60 focus-visible:border-[#14a2ba] focus-visible:ring-[#14a2ba]/25"
                        {...register("password")}
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-[#14a2ba] focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff className="size-4" />
                        ) : (
                            <Eye className="size-4" />
                        )}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-xs text-destructive">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* ── Button ── */}
            <div className="pt-2">
                <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl bg-linear-to-r from-[#125d72] to-[#14a2ba] px-8 text-sm font-semibold text-white shadow-lg shadow-[#14a2ba]/20 transition-all hover:from-[#14758c] hover:to-[#17b5cf] hover:shadow-[#14a2ba]/30"
                >
                    {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
            </div>
        </form>
    );
}
