import { notFound } from "next/navigation";
import { z } from "zod";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import type { TimelineGift } from "@/components/diary/person/GiftTimeline";
import { PersonSpread } from "@/components/diary/person/PersonSpread";
import type { PlanViewData } from "@/components/diary/person/PlanSheet";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { longDate } from "@/lib/diary/format";
import { giftsForHref } from "@/lib/diary/gift-links";
import { toIdeaCards } from "@/lib/diary/page-data";
import { effectivePlanStatus, planFor } from "@/lib/diary/plans";
import { momentPhrase } from "@/lib/diary/present";
import { localDateIn } from "@/lib/diary/recurrence";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { buildDiaryView } from "@/lib/diary/view";
import { signedDiaryPhotoUrls } from "@/lib/storage/diary-photos";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "Diary — GiftPing" };

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ event?: string; welcome?: string }> }) {
  const { id } = await params;
  const { event: eventParam, welcome } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await requireRole("customer", "vendor", "admin");
  // rows, the catalogue, the theme and the wishlist don't depend on each other — fetch together.
  const [rows, pool, theme, wished] = await Promise.all([getDiaryRows(user.id), loadCandidatePool(await createClient()), getActiveTheme(), getWishlistProductIds(user.id)]);
  const contact = rows.contacts.find((c) => c.id === id);
  if (!contact) notFound(); // RLS means another user's id is simply not in `rows`

  const today = localDateIn(rows.timezone);
  const events = rows.events.filter((e) => e.contact_id === id);
  const gifts = rows.gifts.filter((g) => g.contact_id === id);
  const view = buildDiaryView({ contacts: [contact], events, gifts, today });
  const photoUrl = (await signedDiaryPhotoUrls([contact.photo_url])).get(contact.photo_url ?? "") ?? null;

  // The occasion the plan and the ideas are about: the one asked for in the link, otherwise the nearest.
  const asked = eventParam && z.string().uuid().safeParse(eventParam).success ? view.moments.find((m) => m.event.id === eventParam && m.event.is_active) : undefined;
  const target = asked ?? view.nextByContact.get(id);

  const ideas = toIdeaCards(
    suggestGifts({
      person: { relationship: contact.relationship, interests: contact.interests, giftPreferences: contact.gift_preferences },
      context: { eventType: target?.event.event_type ?? null, budgetMax: contact.budget_max === null ? null : Number(contact.budget_max) },
      candidates: pool.candidates,
      alreadyGiftedProductIds: new Set(gifts.map((g) => g.product_id).filter((p): p is string => !!p)),
      limit: 6,
    }),
    pool,
    wished,
  );

  let planView: PlanViewData | null = null;
  const savedPlan = target ? planFor(rows.plans, target.event.id, target.occurrence) : null;
  if (target) {
    const linked = savedPlan ? rows.linkedOrders.get(savedPlan.id) ?? null : null;
    const product = savedPlan?.product_id ? pool.byId.get(savedPlan.product_id) : undefined;
    planView = {
      eventId: target.event.id,
      occasionDate: target.occurrence,
      heading: momentPhrase(contact.name, target.event.event_type, target.event.title),
      dateLabel: longDate(target.occurrence),
      daysAway: target.daysAway,
      plan: savedPlan
        ? {
            id: savedPlan.id,
            status: effectivePlanStatus(savedPlan, linked),
            giftName: savedPlan.gift_name ?? product?.name ?? null,
            productId: savedPlan.product_id,
            productSlug: product?.slug ?? null,
            note: savedPlan.note,
            image: product?.thumbnail ?? null,
            orderId: linked?.id ?? savedPlan.order_id,
            orderNumber: linked?.orderNumber ?? null,
          }
        : null,
    };
  }

  const timeline: TimelineGift[] = gifts.map((g) => ({
    id: g.id,
    year: g.gifted_at.slice(0, 4),
    name: g.gift_name ?? "A gift",
    note: g.notes ?? null,
    amount: g.amount === null ? null : Number(g.amount),
    eventType: g.event_type,
    image: (g.product_id ? pool.byId.get(g.product_id)?.thumbnail : null) ?? g.image ?? null,
  }));

  return (
    <DiaryDesk>
      <PersonSpread
        contact={contact}
        justAdded={welcome === "1"}
        photoUrl={photoUrl}
        events={events}
        moments={view.moments}
        timeline={timeline}
        plan={planView}
        ideas={ideas}
        ideasWho={target ? momentPhrase(contact.name, target.event.event_type, target.event.title) : contact.name}
        pick={target ? { eventId: target.event.id, occasionDate: target.occurrence, pickedProductId: planView?.plan?.productId ?? null } : null}
        defaultEventType={target?.event.event_type}
        giftsHref={giftsForHref(contact.relationship)}
        themeId={theme.id}
      />
    </DiaryDesk>
  );
}
