import { redirect } from "next/navigation";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { ReviewSpread, type ReviewPerson } from "@/components/diary/review/ReviewSpread";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { rememberedStreak, reviewYear } from "@/lib/diary/memories";
import { localDateIn } from "@/lib/diary/recurrence";
import { signedDiaryPhotoUrls } from "@/lib/storage/diary-photos";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "Your gifting year — GiftPing" };

export default async function DiaryReviewPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireRole("customer", "vendor", "admin");
  const [rows, theme, params] = await Promise.all([getDiaryRows(user.id), getActiveTheme(), searchParams]);
  if (rows.contacts.length === 0) redirect("/diary");

  const today = localDateIn(rows.timezone);
  const thisYear = Number(today.slice(0, 4));
  const asked = Number(params.year);
  const year = Number.isInteger(asked) && asked >= 1900 && asked <= thisYear ? asked : thisYear;

  const review = reviewYear({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today, year });
  const streak = rememberedStreak({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today });
  const byId = new Map(rows.contacts.map((c) => [c.id, c]));
  const photoUrls = await signedDiaryPhotoUrls(review.topPeople.map((p) => byId.get(p.contactId)?.photo_url));
  const people: ReviewPerson[] = review.topPeople.flatMap((p) => {
    const c = byId.get(p.contactId);
    return c ? [{ id: c.id, name: c.name, photoUrl: c.photo_url ? photoUrls.get(c.photo_url) ?? null : null, relationship: c.relationship }] : [];
  });

  return (
    <DiaryDesk>
      <ReviewSpread year={year} review={review} streak={streak} people={people} isCurrentYear={year === thisYear} themeId={theme.id} />
    </DiaryDesk>
  );
}
