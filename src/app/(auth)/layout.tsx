import Link from "next/link";
import Image from "next/image";

/**
 * Shared layout for all auth pages (sign-in, sign-up, forgot-password, etc.)
 * This wraps every page inside app/(auth)/* with the dark mountain background,
 * logo header, dashed SVG decoration, and footer branding.
 *
 * URL: /sign-in, /sign-up (route group does NOT add prefix)
 */
export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="dark relative flex min-h-svh flex-col overflow-hidden bg-[#081418] text-foreground">
            {/* ── Background image + overlays ── */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <Image
                    src="/PLN-Danantara.jpeg"
                    alt=""
                    fill
                    className="object-cover opacity-25"
                    priority
                />
                <div className="absolute inset-0 bg-linear-to-br from-[#081418]/95 via-[#081418]/75 to-[#125d72]/10" />
                <div className="absolute inset-0 bg-linear-to-t from-[#081418] via-transparent to-transparent" />
            </div>

            {/* ── Dashed curve decoration ── */}
            <svg
                className="pointer-events-none absolute right-[28%] top-[8%] z-0 hidden h-[82vh] w-[48vw] lg:block"
                viewBox="0 0 500 800"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M480 0 C480 200, 100 300, 250 500 S480 700, 300 800"
                    stroke="rgba(20,162,186,0.08)"
                    strokeWidth="1.5"
                    strokeDasharray="8 8"
                />
            </svg>

            {/* ━━━━━ Top navbar ━━━━━ */}
            <header className="relative z-10 flex items-center px-6 py-5 sm:px-10">
                <Link href="/" className="flex items-center gap-3">
                    <Image
                        src="/Logo_PLN.svg.png"
                        alt="Logo PLN"
                        width={36}
                        height={36}
                        className="size-9 object-contain"
                    />
                    <span className="text-lg font-bold tracking-tight text-white">
                        SISKEU<span className="text-[#14a2ba]">KOM</span>
                    </span>
                </Link>
            </header>

            {/* ━━━━━ Main content (slot) ━━━━━ */}
            <main className="relative z-10 flex flex-1 items-center px-6 sm:px-10 lg:px-20">
                {children}
            </main>

            {/* ━━━━━ Footer ━━━━━ */}
            <footer className="relative z-10 flex justify-end px-6 py-6 sm:px-10">
                <span className="select-none text-2xl font-black tracking-tight text-white/60">
                    SISKEU<span className="text-[#14a2ba]">KOM</span>
                </span>
            </footer>
        </div>
    );
}
