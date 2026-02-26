import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    PUBLIC_ROUTES,
    AUTH_ROUTES,
    DEFAULT_REDIRECT,
} from "@/lib/auth/config";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Proxy (formerly Middleware) for authentication redirects — Next.js 16+
 *
 * Logic:
 * 1. Authenticated user visits auth page → redirect to dashboard.
 * 2. Unauthenticated user visits protected route → redirect to /sign-in.
 * 3. Everything else → pass through.
 *
 * NOTE: The proxy only checks if the cookie EXISTS (fast, no DB hit).
 * Full session validation (DB lookup, expiry, role) happens in
 * Server Components / Server Actions via `validateSession()`.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if session cookie exists (lightweight — no DB call in proxy)
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const isAuthenticated = !!sessionToken;

    const isPublicRoute = PUBLIC_ROUTES.some(
        (route) =>
            route === "/"
                ? pathname === "/"
                : pathname === route || pathname.startsWith(`${route}/`),
    );
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    // Authenticated user trying to access auth pages → redirect to dashboard
    if (isAuthenticated && isAuthRoute) {
        return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url));
    }

    // Unauthenticated user trying to access protected route → redirect to sign-in
    if (!isAuthenticated && !isPublicRoute) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
