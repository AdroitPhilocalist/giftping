import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, uploadRateLimit } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/db/server";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { ImageValidationError, MAX_UPLOAD_BYTES, processProductImage } from "@/lib/storage/resize";
import { removeProductImageFiles, storeProductImage } from "@/lib/storage/upload";
import { sendBackToReviewIfLive, syncProductThumbnail } from "@/lib/vendor/product-helpers";

const MAX_IMAGES_PER_PRODUCT = 8;

// A Route Handler (not a Server Action) on purpose: Server Actions cap request bodies at 1MB by default,
// and photos are bigger than that even after the client-side downscale.
export async function POST(request: Request) {
  try {
    const user = await requireRole("vendor", "admin");

    const limited = await checkRateLimit(uploadRateLimit, `${user.id}:${getClientIp(request)}`);
    if (!limited.success) {
      return NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 });
    }

    const vendor = await getMyVendor(user.id);
    if (!vendor || vendor.status !== "approved") {
      return NextResponse.json({ error: "Your vendor account isn't approved yet." }, { status: 403 });
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Image is larger than 4MB." }, { status: 413 });
    }

    const form = await request.formData();
    const productId = form.get("productId");
    const file = form.get("file");
    if (typeof productId !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing product or file." }, { status: 400 });
    }

    // Ownership check through the user's own session: RLS only returns products this vendor owns.
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("id, vendor_id")
      .eq("id", productId)
      .eq("vendor_id", vendor.id)
      .maybeSingle();
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const { count } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);
    if ((count ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json({ error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos.` }, { status: 400 });
    }

    const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
    const stored = await storeProductImage(vendor.id, product.id, processed);

    const isFirst = (count ?? 0) === 0;
    const { data: row, error } = await supabase
      .from("product_images")
      .insert({
        product_id: product.id,
        url: stored.url,
        medium_url: stored.mediumUrl,
        thumb_url: stored.thumbUrl,
        storage_path: stored.storagePath,
        width: processed.width,
        height: processed.height,
        alt_text: null,
        sort_order: count ?? 0,
        is_primary: isFirst,
      })
      .select("id")
      .single();

    if (error || !row) {
      await removeProductImageFiles(stored.storagePath);
      return NextResponse.json({ error: "Couldn't save the image." }, { status: 500 });
    }

    await syncProductThumbnail(supabase, product.id);
    await sendBackToReviewIfLive(supabase, product.id);

    return NextResponse.json({ id: row.id, url: stored.mediumUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    }
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[upload-image]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
