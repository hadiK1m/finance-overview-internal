"use client";

import { useState, useMemo, useCallback } from "react";
import {
    Users,
    UserCheck,
    Clock,
    Shield,
    UserPlus,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from "@/db/schema";
import { ROLE_LABELS, USER_ROLES } from "@/lib/teams/schemas";
import TeamDataTable from "./TeamDataTable";
import InvitesTable from "./InvitesTable";
import InviteDialog from "./InviteDialog";
import EditUserDialog from "./EditUserDialog";

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

interface PendingInvite {
    id: string;
    email: string;
    role: UserRole;
    status: string;
    message: string | null;
    expiresAt: Date;
    createdAt: Date;
}

interface Stats {
    totalMembers: number;
    activeMembers: number;
    pendingCount: number;
    topRole: string;
    topRoleCount: number;
}

interface TeamsClientProps {
    users: TeamMember[];
    pendingInvites: PendingInvite[];
    stats: Stats;
    currentUserId: string;
    currentUserRole: UserRole;
}

export default function TeamsClient({
    users,
    pendingInvites,
    stats,
    currentUserId,
    currentUserRole,
}: TeamsClientProps) {
    // Filter state
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Dialog state
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editUser, setEditUser] = useState<TeamMember | null>(null);

    // Filtered users
    const filteredUsers = useMemo(() => {
        let result = users;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (u) =>
                    u.firstName.toLowerCase().includes(q) ||
                    u.lastName.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q),
            );
        }

        if (roleFilter !== "all") {
            result = result.filter((u) => u.role === roleFilter);
        }

        if (statusFilter !== "all") {
            result = result.filter((u) =>
                statusFilter === "active" ? u.isActive : !u.isActive,
            );
        }

        return result;
    }, [users, search, roleFilter, statusFilter]);

    const handleEditUser = useCallback((user: TeamMember) => {
        setEditUser(user);
    }, []);

    // Stats cards
    const statCards = [
        {
            label: "Total Anggota",
            value: stats.totalMembers,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Anggota Aktif",
            value: stats.activeMembers,
            icon: UserCheck,
            color: "text-green-600",
            bg: "bg-green-50",
        },
        {
            label: "Pending Invite",
            value: stats.pendingCount,
            icon: Clock,
            color: "text-orange-600",
            bg: "bg-orange-50",
        },
        {
            label: "Role Terbanyak",
            value: `${ROLE_LABELS[stats.topRole] || stats.topRole} (${stats.topRoleCount})`,
            icon: Shield,
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
    ];

    return (
        <div className="space-y-6">
            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.label}>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div
                                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
                            >
                                <card.icon className={`size-5 ${card.color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    {card.label}
                                </p>
                                <p className="truncate text-lg font-bold">
                                    {card.value}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Toolbar: Search + Filters + Invite Button ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 pl-8 pr-8 text-sm"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Role Filter */}
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="h-9 w-36 text-sm">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {USER_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                    {ROLE_LABELS[r] || r}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="h-9 w-32 text-sm">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Invite button */}
                <Button
                    onClick={() => setInviteOpen(true)}
                    className="gap-2"
                    size="sm"
                >
                    <UserPlus className="size-4" />
                    Undang Anggota
                </Button>
            </div>

            {/* ── Tabs: Members / Invites ── */}
            <Tabs defaultValue="members">
                <TabsList>
                    <TabsTrigger value="members">
                        Anggota ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="invites">
                        Pending Invite ({pendingInvites.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                    <TeamDataTable
                        data={filteredUsers}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onEditUser={handleEditUser}
                    />
                </TabsContent>

                <TabsContent value="invites" className="mt-4">
                    <InvitesTable data={pendingInvites} />
                </TabsContent>
            </Tabs>

            {/* ── Dialogs ── */}
            <InviteDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                currentUserRole={currentUserRole}
            />

            {editUser && (
                <EditUserDialog
                    open={!!editUser}
                    onOpenChange={(open: boolean) => {
                        if (!open) setEditUser(null);
                    }}
                    user={editUser}
                    currentUserRole={currentUserRole}
                />
            )}
        </div>
    );
}
