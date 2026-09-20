import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, uploadRateLimit } from "@/lib/auth/rate-limit";
import { ImageValidationError, MAX_UPLOAD_BYTES, processBannerImage } from "@/lib/storage/resize";
import { storeBannerImage } from "@/lib/storage/upload";

// A Route Handler (not a Server Action): images exceed the 1MB Server Action body cap. Admin only — role re-read from the database.
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin");
    const limited = await checkRateLimit(uploadRateLimit, `${user.id}:${getClientIp(request)}`);
    if (!limited.success) return NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 });

    if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Image is larger than 4MB." }, { status: 413 });
    }
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });

    const stored = await storeBannerImage(await processBannerImage(Buffer.from(await file.arrayBuffer())));
    // The form sends back only `path`; the server rebuilds the URLs from it when saving, so a client can never point a banner at an arbitrary image.
    return NextResponse.json({ path: stored.storagePath, previewUrl: stored.mediumUrl });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    if (error instanceof ImageValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[upload-banner]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
