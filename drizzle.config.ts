import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env.local the same way Next.js does,
// so drizzle-kit CLI can read DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
    /* Path to your schema file(s) */
    schema: "./src/db/schema.ts",

    /* Directory where generated migrations will be stored */
    out: "./src/db/migrations",

    /* PostgreSQL dialect */
    dialect: "postgresql",

    /* Database connection — reads from env */
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },

    /* Print verbose SQL during migration */
    verbose: true,

    /* Strict mode — ask confirmation before destructive changes */
    strict: true,
});
