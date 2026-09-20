import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, uploadRateLimit } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/db/server";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { ImageValidationError, MAX_UPLOAD_BYTES, processVendorBanner, processVendorLogo } from "@/lib/storage/resize";
import { removeBrandingFiles, storeVendorBanner, storeVendorLogo } from "@/lib/storage/branding";

// A Route Handler (not a Server Action): images exceed the 1MB Server Action body cap.
// The vendor is whoever is signed in — never an id from the request — and the row is updated through their OWN session, so RLS and the
// vendors_*_own_file constraints (the URL must be a file in this vendor's own folder) apply on top of these checks.
export async function POST(request: Request) {
  try {
    const user = await requireRole("vendor", "admin");
    const limited = await checkRateLimit(uploadRateLimit, `${user.id}:${getClientIp(request)}`);
    if (!limited.success) return NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 });

    const vendor = await getMyVendor(user.id);
    if (!vendor || vendor.status !== "approved") return NextResponse.json({ error: "Your vendor account isn't approved yet." }, { status: 403 });

    if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Image is larger than 4MB." }, { status: 413 });
    }
    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if ((kind !== "logo" && kind !== "banner") || !(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());

    const previous = kind === "logo" ? vendor.logo_url : vendor.banner_url;
    const stored = kind === "logo" ? await storeVendorLogo(vendor.id, (await processVendorLogo(bytes)).logo) : await storeVendorBanner(vendor.id, await processVendorBanner(bytes));

    const { data, error } = await (await createClient())
      .from("vendors")
      .update(kind === "logo" ? { logo_url: stored.url } : { banner_url: stored.url })
      .eq("id", vendor.id)
      .select("id");
    if (error || !data || data.length === 0) {
      await removeBrandingFiles(stored.url);
      return NextResponse.json({ error: "Couldn't save the image." }, { status: 500 });
    }

    await removeBrandingFiles(previous); // the new file is saved; the old one is no longer referenced
    revalidatePath("/vendor/settings");
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${vendor.slug}`);
    return NextResponse.json({ url: stored.url });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    if (error instanceof ImageValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[upload-branding]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
