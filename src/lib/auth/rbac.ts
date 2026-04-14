import { type UserRole, USER_ROLES } from "@/db/schema";

/* ══════════════════════════════════════════════════════
   Permission Definitions
   ══════════════════════════════════════════════════════

   Centralised permission map — the SINGLE source of truth.
   Import `can` / `canAny` everywhere instead of hard-coding
   role strings across the codebase.

   ┌──────────────┬───────────┬───────────┬───────────┬──────────────┐
   │ Capability    │ super_admin│   admin   │ komisaris │    user      │
   ├──────────────┼───────────┼───────────┼───────────┼──────────────┤
   │ read:own     │     ✓     │     ✓     │     ✓     │      ✓       │
   │ read:all     │     ✓     │     ✗     │     ✓     │      ✗       │
   │ create       │     ✓     │     ✓     │     ✗     │      ✗       │
   │ update:own   │     ✓     │     ✓     │     ✗     │      ✗       │
   │ update:all   │     ✓     │     ✗     │     ✗     │      ✗       │
   │ delete:own   │     ✓     │     ✓     │     ✗     │      ✗       │
   │ delete:all   │     ✓     │     ✗     │     ✗     │      ✗       │
   │ manage:users │     ✓     │     ✗     │     ✗     │      ✗       │
   └──────────────┴───────────┴───────────┴───────────┴──────────────┘
   ══════════════════════════════════════════════════════ */

export const PERMISSIONS = [
    "read:own",
    "read:all",
    "create",
    "update:own",
    "update:all",
    "delete:own",
    "delete:all",
    "manage:users",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Static role → permission map.
 * Add new permissions here — never scatter role checks across files.
 */
const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
    super_admin: new Set<Permission>([
        "read:own",
        "read:all",
        "create",
        "update:own",
        "update:all",
        "delete:own",
        "delete:all",
        "manage:users",
    ]),
    admin: new Set<Permission>([
        "read:own",
        "create",
        "update:own",
        "delete:own",
    ]),
    komisaris: new Set<Permission>([
        "read:own",
        "read:all",
    ]),
    user: new Set<Permission>([
        "read:own",
    ]),
};

/* ══════════════════════════════════════════════════════
   Helper Functions
   ══════════════════════════════════════════════════════ */

/**
 * Check if a role has a **single** permission.
 *
 * @example
 * if (!can(user.role, "create")) return forbidden();
 */
export function can(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a role has **at least one** of the listed permissions.
 *
 * @example
 * if (!canAny(user.role, ["read:all", "read:own"])) return forbidden();
 */
export function canAny(role: UserRole, permissions: Permission[]): boolean {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return permissions.some((p) => perms.has(p));
}

/**
 * Check if a role has **all** of the listed permissions.
 *
 * @example
 * if (!canAll(user.role, ["create", "delete:own"])) return forbidden();
 */
export function canAll(role: UserRole, permissions: Permission[]): boolean {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return permissions.every((p) => perms.has(p));
}

/**
 * Get all permissions for a given role.
 */
export function getPermissions(role: UserRole): readonly Permission[] {
    return [...(ROLE_PERMISSIONS[role] ?? [])];
}

/**
 * Type guard — check if a string is a valid UserRole.
 */
export function isValidRole(value: unknown): value is UserRole {
    return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}
