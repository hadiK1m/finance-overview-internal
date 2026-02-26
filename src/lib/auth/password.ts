import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing utilities.
 *
 * Argon2id is the recommended algorithm (OWASP 2024+):
 * - Resistant to side-channel attacks (from Argon2i)
 * - Resistant to GPU cracking (from Argon2d)
 *
 * These parameters follow OWASP minimum recommendations:
 * - memoryCost: 19456 KiB (~19 MB)
 * - timeCost: 2 iterations
 * - parallelism: 1
 */

const ARGON2_OPTIONS = {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
};

/**
 * Hash a plain-text password using Argon2id.
 *
 * @param password - The plain-text password from the user.
 * @returns The Argon2id hash string (includes salt, params, and hash).
 *
 * @example
 * const hashed = await hashPassword("mySecureP@ss");
 * // "$argon2id$v=19$m=19456,t=2,p=1$..."
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plain-text password against an Argon2id hash.
 *
 * @param hash - The stored Argon2id hash from the database.
 * @param password - The plain-text password to verify.
 * @returns `true` if the password matches, `false` otherwise.
 *
 * @example
 * const isValid = await verifyPassword(user.passwordHash, "mySecureP@ss");
 */
export async function verifyPassword(
    storedHash: string,
    password: string
): Promise<boolean> {
    try {
        return await verify(storedHash, password);
    } catch {
        // If the hash is malformed or verification fails, return false
        return false;
    }
}
