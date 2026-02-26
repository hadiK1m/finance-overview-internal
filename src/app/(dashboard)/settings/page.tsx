import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/config";
import SettingsClient from "./_components/SettingsClient";

/**
 * Settings Page — Server Component
 *
 * 1. requireAuth() ensures only authenticated users can access
 * 2. Fetches full profile data (NEVER includes passwordHash)
 * 3. Passes safe data to the client component
 */
export default async function SettingsPage() {
    const sessionUser = await requireAuth();

    // Fetch profile fields — explicitly exclude passwordHash
    const [profile] = await db
        .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            bio: users.bio,
            image: users.image,
        })
        .from(users)
        .where(eq(users.id, sessionUser.userId))
        .limit(1);

    return (
        <SettingsClient
            user={{
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                phone: profile.phone,
                bio: profile.bio,
                image: profile.image,
            }}
        />
    );
}
