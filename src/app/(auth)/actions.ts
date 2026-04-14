"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, DEFAULT_ROLE } from "@/db/schema";
import {
    signInSchema,
    signUpSchema,
    type SignInValues,
    type SignUpValues,
} from "@/lib/auth/schemas";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

/* ────────────── Response type ────────────── */
export type ActionResult =
    | { success: true; error: null }
    | { success: false; error: string };

/* ══════════════════════════════════════════════
   Sign In
   ══════════════════════════════════════════════ */

export async function signInAction(data: SignInValues): Promise<ActionResult> {
    const parsed = signInSchema.safeParse(data);

    if (!parsed.success) {
        return { success: false, error: "Invalid credentials. Please check your input." };
    }

    try {
        // 1. Find user by email
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, parsed.data.email.toLowerCase()))
            .limit(1);

        if (!user) {
            return { success: false, error: "Invalid email or password." };
        }

        // 2. Check if account is active
        if (!user.isActive) {
            return { success: false, error: "Your account has been deactivated. Contact an administrator." };
        }

        // 3. Verify password (Argon2id)
        const validPassword = await verifyPassword(
            user.passwordHash,
            parsed.data.password,
        );

        if (!validPassword) {
            return { success: false, error: "Invalid email or password." };
        }

        // 4. Update last login timestamp
        await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        // 5. Create session (writes cookie + DB row)
        await createSession(user.id);
    } catch (error) {
        console.error("[signInAction] Error:", error);
        return { success: false, error: "Something went wrong. Please try again." };
    }

    // 6. Redirect to dashboard (MUST be outside try-catch because
    //    Next.js redirect() throws a special error internally)
    redirect("/dashboard");
}

/* ══════════════════════════════════════════════
   Sign Up
   ══════════════════════════════════════════════ */

export async function signUpAction(data: SignUpValues): Promise<ActionResult> {
    const parsed = signUpSchema.safeParse(data);

    if (!parsed.success) {
        return { success: false, error: "Invalid input. Please check your data." };
    }

    try {
        const email = parsed.data.email.toLowerCase();

        // 1. Check if user already exists
        const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existing) {
            return {
                success: false,
                error: "An account with this email already exists.",
            };
        }

        // 2. Hash password with Argon2id
        const passwordHash = await hashPassword(parsed.data.password);

        // 3. Create user — always DEFAULT_ROLE, never from client input
        const [newUser] = await db
            .insert(users)
            .values({
                firstName: parsed.data.firstName,
                lastName: parsed.data.lastName,
                email,
                passwordHash,
                role: DEFAULT_ROLE,
            })
            .returning({ id: users.id });

        // 4. Auto-login: create session immediately after sign-up
        await createSession(newUser.id);
    } catch (error) {
        console.error("[signUpAction] Error:", error);
        return { success: false, error: "Something went wrong. Please try again." };
    }

    // 5. Redirect to dashboard (outside try-catch)
    redirect("/dashboard");
}

/* ══════════════════════════════════════════════
   Sign Out
   ══════════════════════════════════════════════ */

export async function signOutAction(): Promise<void> {
    await destroySession();
    redirect("/sign-in");
}
