import { redirect } from "next/navigation";
import type { UserRole } from "@/db/schema";
import { validateSession, type SessionUser } from "./session";
import { can, type Permission } from "./rbac";

/* ══════════════════════════════════════════════════════
   Route Constants
   ══════════════════════════════════════════════════════ */

/** Public routes that don't require authentication */
export const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up"];

/** Routes that should redirect authenticated users (e.g., to dashboard) */
export const AUTH_ROUTES = ["/sign-in", "/sign-up"];

/** Where to redirect after successful sign-in */
export const DEFAULT_REDIRECT = "/dashboard";

/* ══════════════════════════════════════════════════════
   Re-export SessionUser
   ══════════════════════════════════════════════════════ */

export type { SessionUser };

/* ══════════════════════════════════════════════════════
   Auth Helper Functions
   ══════════════════════════════════════════════════════ */

/**
 * Get the currently authenticated user from the session cookie.
 * Returns null if not authenticated. Does NOT redirect.
 *
 * Use in Server Components / Server Actions when you want optional auth.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
    return validateSession();
}

/**
 * Require authentication. Redirects to /sign-in if not authenticated.
 * Use in Server Components / Server Actions that MUST be protected.
 *
 * @example
 * const user = await requireAuth();
 * // user is guaranteed non-null here
 */
export async function requireAuth(): Promise<SessionUser> {
    const user = await validateSession();
    if (!user) {
        redirect("/sign-in");
    }
    return user;
}

/**
 * Require a specific permission. Redirects to /sign-in or throws 403.
 *
 * @example
 * const user = await requirePermission("create");
 */
export async function requirePermission(
    permission: Permission,
): Promise<SessionUser> {
    const user = await requireAuth();
    if (!can(user.role, permission)) {
        redirect("/unauthorized");
    }
    return user;
}

/* ══════════════════════════════════════════════════════
   Role Check Helpers
   ══════════════════════════════════════════════════════ */

export function isSuperAdmin(role: UserRole): boolean {
    return role === "super_admin";
}

export function isAdmin(role: UserRole): boolean {
    return role === "admin";
}

export function isKomisaris(role: UserRole): boolean {
    return role === "komisaris";
}

export function isAdminOrAbove(role: UserRole): boolean {
    return role === "admin" || role === "super_admin";
}
