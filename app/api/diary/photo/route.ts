import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, uploadRateLimit } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/db/server";
import { ImageValidationError, MAX_UPLOAD_BYTES, processDiaryPhoto } from "@/lib/storage/resize";
import { removeDiaryPhoto, storeDiaryPhoto } from "@/lib/storage/diary-photos";

// A Route Handler (not a Server Action): photos exceed the 1MB Server Action body cap.
// Whose diary is whoever is signed in — never an id from the request. The person is looked up through the USER's own session, so RLS (owner only, no admin
// bypass) is what proves they own it, and the row is updated the same way, so the photo_url CHECK (must be a file in their own folder, named for that person)
// applies on top of these checks. The bytes are re-encoded by sharp before storage, and the bucket is private.
const idSchema = z.string().uuid();

async function gate(request: Request) {
  const user = await requireRole("customer", "vendor", "admin");
  const limited = await checkRateLimit(uploadRateLimit, `${user.id}:${getClientIp(request)}`);
  if (!limited.success) return { user, limited: NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 }) };
  return { user, limited: null };
}

const errorResponse = (error: unknown) => {
  if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
  if (error instanceof ImageValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("[diary-photo]", error);
  return NextResponse.json({ error: "Upload failed." }, { status: 500 });
};

export async function POST(request: Request) {
  try {
    const { user, limited } = await gate(request);
    if (limited) return limited;
    if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: "Photo is larger than 4MB." }, { status: 413 });

    const form = await request.formData();
    const contactId = form.get("contactId");
    const file = form.get("file");
    if (typeof contactId !== "string" || !idSchema.safeParse(contactId).success || !(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });

    const client = await createClient();
    const { data: contact } = await client.from("diary_contacts").select("id, photo_url").eq("id", contactId).eq("user_id", user.id).maybeSingle();
    if (!contact) return NextResponse.json({ error: "That person isn't in your diary." }, { status: 404 });

    const image = await processDiaryPhoto(Buffer.from(await file.arrayBuffer()));
    const stored = await storeDiaryPhoto(user.id, contact.id, image);

    const { data, error } = await client.from("diary_contacts").update({ photo_url: stored.path }).eq("id", contact.id).eq("user_id", user.id).select("id");
    if (error || !data || data.length === 0) {
      await removeDiaryPhoto(stored.path);
      return NextResponse.json({ error: "Couldn't save the photo." }, { status: 500 });
    }
    await removeDiaryPhoto(contact.photo_url); // the new file is saved; the old one is no longer referenced
    revalidatePath("/diary", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, limited } = await gate(request);
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as { contactId?: unknown } | null;
    if (!body || typeof body.contactId !== "string" || !idSchema.safeParse(body.contactId).success) return NextResponse.json({ error: "Invalid person." }, { status: 400 });

    const client = await createClient();
    const { data: contact } = await client.from("diary_contacts").select("id, photo_url").eq("id", body.contactId).eq("user_id", user.id).maybeSingle();
    if (!contact) return NextResponse.json({ error: "That person isn't in your diary." }, { status: 404 });

    const { error } = await client.from("diary_contacts").update({ photo_url: null }).eq("id", contact.id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Couldn't remove the photo." }, { status: 500 });
    await removeDiaryPhoto(contact.photo_url);
    revalidatePath("/diary", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
