"use client";

import * as React from "react";
import { User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

import ProfileForm from "./ProfileForm";
import AvatarUpload from "./AvatarUpload";
import ChangePasswordForm from "./ChangePasswordForm";

/* ── Tab definitions ── */
const TABS = [
    { id: "profile", label: "Profil", icon: User },
    { id: "security", label: "Keamanan", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SettingsClientProps {
    user: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        bio: string | null;
        image: string | null;
    };
}

export default function SettingsClient({ user }: SettingsClientProps) {
    const [activeTab, setActiveTab] = React.useState<TabId>("profile");

    return (
        <div className="space-y-6">
            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Pengaturan Akun
                </h1>
                <p className="text-sm text-muted-foreground">
                    Kelola profil dan keamanan akun Anda.
                </p>
            </div>

            {/* ── Layout: sidebar tabs + content ── */}
            <div className="flex flex-col gap-8 md:flex-row">
                {/* Sidebar navigation */}
                <nav className="flex shrink-0 flex-row gap-1 md:w-52 md:flex-col">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                                activeTab === id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Content area */}
                <div className="flex-1 space-y-6">
                    {activeTab === "profile" && (
                        <>
                            <AvatarUpload
                                currentImage={user.image}
                                userName={`${user.firstName} ${user.lastName}`}
                            />
                            <ProfileForm
                                defaultValues={{
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    phone: user.phone,
                                    bio: user.bio,
                                }}
                            />
                        </>
                    )}

                    {activeTab === "security" && <ChangePasswordForm />}
                </div>
            </div>
        </div>
    );
}
