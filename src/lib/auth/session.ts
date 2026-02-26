import { randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";

/* ══════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════ */

/** Cookie name for the session token */
export const SESSION_COOKIE = "session";

/** Session duration: 30 days (in seconds) */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Session rotation: refresh if less than 15 days remain */
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24 * 15; // 15 days

/* ══════════════════════════════════════════════════════
   Session User Type
   ══════════════════════════════════════════════════════ */

export type SessionUser = {
    userId: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    email: string;
};

/* ══════════════════════════════════════════════════════
   Token Generation
   ══════════════════════════════════════════════════════ */

/**
 * Generate a cryptographically secure session token.
 * 32 bytes = 64 hex chars — sufficient entropy for session IDs.
 */
function generateToken(): string {
    return randomBytes(32).toString("hex");
}

/* ══════════════════════════════════════════════════════
   Create Session
   ══════════════════════════════════════════════════════ */

/**
 * Create a new session in the database and set the HTTP-only cookie.
 *
 * @param userId - The authenticated user's ID.
 * @returns The session token string.
 */
export async function createSession(userId: string): Promise<string> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    // Insert session into DB
    await db.insert(sessions).values({
        userId,
        token,
        expiresAt,
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
    });

    return token;
}

/* ══════════════════════════════════════════════════════
   Validate Session
   ══════════════════════════════════════════════════════ */

/**
 * Validate the current session from cookies.
 * Returns the authenticated user or null if invalid/expired.
 *
 * Also performs session rotation: if the session is past the
 * refresh threshold, a new expiry is set automatically.
 */
export async function validateSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    try {
        // Join sessions + users in one query
        const [result] = await db
            .select({
                sessionId: sessions.id,
                expiresAt: sessions.expiresAt,
                userId: users.id,
                role: users.role,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                isActive: users.isActive,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userId, users.id))
            .where(
                and(
                    eq(sessions.token, token),
                    gt(sessions.expiresAt, new Date()),
                ),
            )
            .limit(1);

        if (!result) {
            // Session not found or expired — clear the cookie
            cookieStore.delete(SESSION_COOKIE);
            return null;
        }

        // Account deactivated — destroy session
        if (!result.isActive) {
            await destroySession(token);
            return null;
        }

        // Session rotation: extend if near expiry
        const timeRemaining = result.expiresAt.getTime() - Date.now();
        if (timeRemaining < SESSION_REFRESH_THRESHOLD * 1000) {
            const newExpiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
            await db
                .update(sessions)
                .set({ expiresAt: newExpiresAt })
                .where(eq(sessions.id, result.sessionId));

            cookieStore.set(SESSION_COOKIE, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: SESSION_MAX_AGE,
            });
        }

        return {
            userId: result.userId,
            role: result.role as UserRole,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
        };
    } catch (error) {
        console.error("[validateSession] Error:", error);
        return null;
    }
}

/* ══════════════════════════════════════════════════════
   Destroy Session (Logout)
   ══════════════════════════════════════════════════════ */

/**
 * Delete a session from DB and clear the cookie.
 * If no token is provided, reads from the current cookie.
 */
export async function destroySession(token?: string): Promise<void> {
    const cookieStore = await cookies();
    const sessionToken = token ?? cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionToken) {
        await db.delete(sessions).where(eq(sessions.token, sessionToken));
    }

    cookieStore.delete(SESSION_COOKIE);
}

/* ══════════════════════════════════════════════════════
   Destroy All Sessions for a User
   ══════════════════════════════════════════════════════ */

/**
 * Invalidate ALL sessions for a user (e.g., password change, account lock).
 */
export async function destroyAllSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
}
