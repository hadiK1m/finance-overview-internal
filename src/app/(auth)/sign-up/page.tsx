import type { Metadata } from "next";
import Link from "next/link";
import SignUpForm from "../_components/SignUpForm";

export const metadata: Metadata = {
    title: "Sign Up — SISKEUKOM",
    description: "Buat akun SISKEUKOM baru",
};

export default function SignUpPage() {
    return (
        <div className="w-full max-w-lg py-10">
            {/* Tagline */}
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#14a2ba]">
                Start for free
            </p>

            {/* Heading */}
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                Create new account
                <span className="text-[#14a2ba]">.</span>
            </h1>

            {/* Already a member */}
            <p className="mt-3 text-sm text-muted-foreground">
                Already A Member?{" "}
                <Link
                    href="/sign-in"
                    className="font-semibold text-[#14a2ba] transition-colors hover:text-[#e7f6f9] hover:underline"
                >
                    Sign In
                </Link>
            </p>

            {/* Form */}
            <div className="mt-8">
                <SignUpForm />
            </div>
        </div>
    );
}
