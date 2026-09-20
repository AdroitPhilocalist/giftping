import { createClient } from "@/lib/db/server";
import { visibleBanners, type Viewer } from "@/lib/content/banners";

export interface HomeBanner {
  id: string;
  imageUrl: string;
  headline: string | null;
  subheading: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  alt: string;
}

/**
 * Banners for the homepage. Two layers decide what is shown: row-level security only ever returns banners that are live RIGHT NOW (so a scheduled campaign
 * can't be read early through the API), and visibleBanners() then applies the audience and ordering. A failure here must never break the homepage.
 */
export async function getHomeBanners(viewer: Viewer): Promise<HomeBanner[]> {
  try {
    const { data, error } = await (await createClient())
      .from("banners")
      .select("id, image_url, headline, subheading, cta_text, cta_url, alt_text, target_audience, starts_at, ends_at, sort_order, is_active, created_at");
    if (error) throw error;
    return visibleBanners(data ?? [], viewer)
      .slice(0, 6)
      .map((b) => ({
        id: b.id,
        imageUrl: b.image_url,
        headline: b.headline,
        subheading: b.subheading,
        ctaText: b.cta_text,
        ctaUrl: b.cta_url,
        alt: b.alt_text || b.headline || "GiftPing offer",
      }));
  } catch (error) {
    console.error("Couldn't load homepage banners", error);
    return [];
  }
}
