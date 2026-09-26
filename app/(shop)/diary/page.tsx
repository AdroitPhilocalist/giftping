import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { HomeSpread } from "@/components/diary/HomeSpread";
import { FirstRun } from "@/components/diary/FirstRun";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { computeGiftingScore } from "@/lib/diary/gifting-score";
import { rememberedStreak } from "@/lib/diary/memories";
import { toCalendarMarks, toIdeaCards, toMomentCard, toPersonCards } from "@/lib/diary/page-data";
import { firstName, momentPhrase } from "@/lib/diary/present";
import { localDateIn } from "@/lib/diary/recurrence";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { buildDiaryView } from "@/lib/diary/view";
import { signedDiaryPhotoUrls } from "@/lib/storage/diary-photos";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "My Gifting Diary — GiftPing" };

export default async function DiaryPage() {
  const user = await requireRole("customer", "vendor", "admin");
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
  const view = buildDiaryView({ contacts: rows.contacts, events: rows.events, gifts: rows.gifts, today });
  const score = computeGiftingScore(view.scoreInput);
  const streak = rememberedStreak({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today });
  const photoUrls = await signedDiaryPhotoUrls(rows.contacts.map((c) => c.photo_url));

  const people = toPersonCards(rows.contacts, view.nextByContact, photoUrls);
  const moments = view.upcoming.map(toMomentCard);
  const marks = toCalendarMarks(rows.events, rows.contacts, today);

  // ideas for the nearest moment that still needs a gift
  const target = view.upcoming.find((m) => !m.handled);
  const giftedBy = new Set(rows.gifts.filter((g) => target && g.contact_id === target.contact.id && g.product_id).map((g) => g.product_id!));
  const ideas = target
    ? toIdeaCards(
        suggestGifts({
          person: { relationship: target.contact.relationship, interests: target.contact.interests, giftPreferences: target.contact.gift_preferences },
          context: { eventType: target.event.event_type, budgetMax: target.contact.budget_max === null ? null : Number(target.contact.budget_max) },
          candidates: pool.candidates,
          alreadyGiftedProductIds: giftedBy,
          limit: 3,
        }),
        pool,
        wished,
      )
    : [];

  const options = rows.contacts.map((c) => ({ id: c.id, name: c.name }));

  return (
    <DiaryDesk className="xl:pb-5 xl:pt-3">
      <HomeSpread
        name={name}
        today={today}
        moments={moments}
        ideas={ideas}
        ideasWho={target ? momentPhrase(target.contact.name, target.event.event_type, target.event.title) : null}
        ideasMoreHref={target ? `/diary/people/${target.contact.id}?event=${target.event.id}#ideas` : null}
        score={score}
        streak={streak}
        marks={marks}
        people={people}
        options={options}
        themeId={theme.id}
      />
    </DiaryDesk>
  );
}
