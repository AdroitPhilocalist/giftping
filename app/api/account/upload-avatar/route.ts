import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, uploadRateLimit } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/db/server";
import { ImageValidationError, MAX_UPLOAD_BYTES, processUserAvatar } from "@/lib/storage/resize";
import { removeAvatarFile, storeUserAvatar } from "@/lib/storage/avatar";

// A Route Handler (not a Server Action): images exceed the 1MB Server Action body cap, same reasoning as
// /api/vendor/upload-branding. The user is whoever is signed in — never an id from the request — and the
// row is updated through their OWN session, so RLS plus the users_avatar_url_own_file constraint (the URL
// must be a file in this user's own folder) apply on top of these checks.
export async function POST(request: Request) {
  try {
    const user = await requireRole("customer", "vendor", "admin");
    const limited = await checkRateLimit(uploadRateLimit, `${user.id}:${getClientIp(request)}`);
    if (!limited.success) return NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 });

    if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Image is larger than 4MB." }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());

    const { data: before } = await (await createClient()).from("users").select("avatar_url").eq("id", user.id).maybeSingle();
    const avatar = await processUserAvatar(bytes);
    const stored = await storeUserAvatar(user.id, avatar);

    const { data, error } = await (await createClient())
      .from("users")
      .update({ avatar_url: stored.url })
      .eq("id", user.id)
      .select("id");
    if (error || !data || data.length === 0) {
      await removeAvatarFile(stored.url);
      return NextResponse.json({ error: "Couldn't save the photo." }, { status: 500 });
    }

    await removeAvatarFile(before?.avatar_url ?? null); // the new file is saved; the old one is no longer referenced
    revalidatePath("/account/profile");
    revalidatePath("/", "layout");
    return NextResponse.json({ url: stored.url });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    if (error instanceof ImageValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[upload-avatar]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
