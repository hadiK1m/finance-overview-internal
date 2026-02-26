import { requireAuth } from "@/lib/auth/config";
import DashboardShell from "./_components/DashboardShell";

/**
 * Server layout — validates session BEFORE rendering anything.
 * If not authenticated, requireAuth() redirects to /sign-in.
 */
export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await requireAuth();

    return <DashboardShell user={user}>{children}</DashboardShell>;
}
