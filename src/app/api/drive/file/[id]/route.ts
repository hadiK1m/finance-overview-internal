import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { driveFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateSession } from "@/lib/auth/session";

/**
 * GET /api/drive/file/[id]
 *
 * Serves a drive file with auth check.
 * Add ?download=true for attachment disposition.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    // Auth check
    const user = await validateSession();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch file record — enforce user ownership
    const [file] = await db
        .select()
        .from(driveFiles)
        .where(
            and(eq(driveFiles.id, id), eq(driveFiles.userId, user.userId)),
        );

    if (!file) {
        return NextResponse.json(
            { error: "File not found" },
            { status: 404 },
        );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), file.storagePath);

    try {
        const buffer = await readFile(filePath);

        const isDownload =
            request.nextUrl.searchParams.get("download") === "true";
        const disposition = isDownload
            ? `attachment; filename="${encodeURIComponent(file.name)}"`
            : `inline; filename="${encodeURIComponent(file.name)}"`;

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": file.mimeType,
                "Content-Disposition": disposition,
                "Content-Length": String(file.size),
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch {
        return NextResponse.json(
            { error: "File not found on disk" },
            { status: 404 },
        );
    }
}
