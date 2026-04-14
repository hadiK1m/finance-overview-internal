import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SISKEUKOM",
    description: "Sistem Keuangan Dewan Komisaris",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id" suppressHydrationWarning>
            <body>
                {children}
            </body>
        </html>
    );
}
