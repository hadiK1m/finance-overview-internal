"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Home,
    ArrowLeftRight,
    Layers3,
    Package,
    Landmark,
    HardDrive,
    Users,
    Settings,
    LogOut,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth/session";

/* ── Navigation items ── */
const NAV_ITEMS = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/balance-rkap", label: "Saldo RKAP", icon: Layers3 },
    { href: "/items-rkap", label: "Items & RKAP", icon: Package },
    { href: "/cash-balance", label: "Cash & Balance", icon: Landmark },
    { href: "/d-drive", label: "D Drive", icon: HardDrive },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface DashboardShellProps {
    user: SessionUser;
    children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
    const pathname = usePathname();

    return (
        <div className="relative min-h-svh bg-muted/40">
            {/* ━━━━━ Header with background image ━━━━━ */}
            <header className="relative isolate overflow-hidden bg-blue-700 pb-32">
                {/* Background image */}
                <Image
                    src="/PLN-Danantara.jpeg"
                    alt=""
                    fill
                    className="absolute inset-0 -z-10 object-cover opacity-30 mix-blend-overlay"
                    priority
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-blue-700/80 to-blue-500/80" />

                {/* Top bar: Logo + User menu */}
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 lg:px-14">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <Image
                            src="/Logo_PLN.svg.png"
                            alt="Logo PLN"
                            width={36}
                            height={36}
                            className="size-9 object-contain "
                        />
                        <span className="text-lg font-bold tracking-tight text-white">
                            SISKEU<span className="text-blue-200">KOM</span>
                        </span>
                    </Link>

                    {/* User dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="gap-2 text-white hover:bg-white/10 hover:text-white"
                            >
                                <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                                    <User className="size-4" />
                                </div>
                                <span className="hidden text-sm font-medium sm:inline">
                                    {user.firstName} {user.lastName}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <p className="text-sm font-medium">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {user.email}
                                </p>
                                <p className="mt-1 text-xs font-normal capitalize text-muted-foreground">
                                    Role: {user.role.replace("_", " ")}
                                </p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 size-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => signOutAction()}
                            >
                                <LogOut className="mr-2 size-4" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Navigation */}
                <nav className="mx-auto max-w-7xl px-4 lg:px-14">
                    <div className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
                        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                            const isActive =
                                href === "/dashboard"
                                    ? pathname === "/dashboard"
                                    : pathname.startsWith(href);

                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-white/15 text-white"
                                            : "text-blue-100 hover:bg-white/10 hover:text-white",
                                    )}
                                >
                                    <Icon className="size-4" />
                                    <span className="hidden sm:inline">
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </header>

            {/* ━━━━━ Main content — overlaps header ━━━━━ */}
            <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-14 -mt-24">
                <main className="min-h-[70vh] rounded-xl bg-white p-4 shadow-sm md:p-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="py-8 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} SISKEUKOM — PT PLN (Persero).
                    All rights reserved.
                </footer>
            </div>
        </div>
    );
}
