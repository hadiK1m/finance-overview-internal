import { z } from "zod/v4";

/* ─────────────── Sign-In ─────────────── */
export const signInSchema = z.object({
    email: z.email("Please enter a valid email"),
    password: z.string().min(1, "Password is required"),
});

export type SignInValues = z.infer<typeof signInSchema>;

/* ─────────────── Sign-Up ─────────────── */
export const signUpSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
