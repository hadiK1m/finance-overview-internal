import type { Metadata } from "next";
import Link from "next/link";
import SignInForm from "../_components/SignInForm";

export const metadata: Metadata = {
    title: "Sign In — SISKEUKOM",
    description: "Masuk ke akun SISKEUKOM Anda",
};

export default function SignInPage() {
    return (
        <div className="w-full max-w-md py-10">
            {/* Tagline */}
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#14a2ba]">
                Welcome back
            </p>

            {/* Heading */}
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                Sign in to your
                <br />
                account<span className="text-[#14a2ba]">.</span>
            </h1>

            {/* Not a member */}
            <p className="mt-3 text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                    href="/sign-up"
                    className="font-semibold text-[#14a2ba] transition-colors hover:text-[#e7f6f9] hover:underline"
                >
                    Sign Up
                </Link>
            </p>

            {/* Form */}
            <div className="mt-8">
                <SignInForm />
            </div>
        </div>
    );
}
