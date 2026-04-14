import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection singleton.
 *
 * Uses `postgres` (postgres-js) driver — the fastest pure-JS Postgres client.
 * Connection string is read from DATABASE_URL environment variable.
 *
 * In production: uses connection pooling (max 10).
 * In development: reuses a global instance to survive HMR reloads.
 */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error(
        "❌ DATABASE_URL is not set. Please add it to your .env.local file.\n" +
        "   Example: DATABASE_URL=postgresql://user:password@localhost:5432/siskeukom"
    );
}

/**
 * In development, store the client on `globalThis` so that
 * hot-module-replacement doesn't create a new pool on every reload.
 */
const globalForDb = globalThis as unknown as {
    pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
    globalForDb.pgClient ??
    postgres(DATABASE_URL, {
        max: process.env.NODE_ENV === "production" ? 10 : 3,
        idle_timeout: 20,
        connect_timeout: 10,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
}

/**
 * Drizzle ORM instance — import this wherever you need DB access.
 *
 * @example
 * import { db } from "@/db";
 * const allUsers = await db.select().from(users);
 */
export const db = drizzle(client, { schema });
