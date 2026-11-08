import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { FirstRun } from "@/components/diary/FirstRun";
import { DiaryBook } from "@/components/diary/flip/DiaryBook";
import { buildHomeSpreads } from "@/components/diary/pages/buildSpreads";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { buildHomeBookData } from "@/lib/diary/home-book";
import { firstName } from "@/lib/diary/present";
import { localDateIn } from "@/lib/diary/recurrence";
import { signedDiaryPhotoUrls } from "@/lib/storage/diary-photos";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "My Gifting Diary — GiftPing", robots: { index: false, follow: false } };

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [user, params] = await Promise.all([requireRole("customer", "vendor", "admin"), searchParams]);
  const supabase = await createClient();
  // none of these depend on each other — fetch together
  const [rows, pool, theme, wished] = await Promise.all([getDiaryRows(user.id), loadCandidatePool(supabase), getActiveTheme(), getWishlistProductIds(user.id)]);
  const name = firstName(user.fullName);

  if (rows.contacts.length === 0) {
    return (
      <DiaryDesk>
        <FirstRun firstName={name === "Your" ? "" : name} />
      </DiaryDesk>
    );
  }

  const today = localDateIn(rows.timezone);
  const photoUrls = await signedDiaryPhotoUrls(rows.contacts.map((c) => c.photo_url));
  const data = buildHomeBookData({ rows, pool, wished, photoUrls, today });

  return (
    <DiaryDesk className="xl:pb-4 xl:pt-3">
      <DiaryBook spreads={buildHomeSpreads(name, data, theme.id)} initialId={params.p} />
    </DiaryDesk>
  );
}
