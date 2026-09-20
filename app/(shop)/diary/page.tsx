import Link from "next/link";
import { Cake, Gift, Heart, ShieldCheck } from "lucide-react";
import { ContactDialog, GiftDialog } from "@/components/diary/DiaryForms";
import { GiftingScoreCard } from "@/components/diary/GiftingScoreCard";
import { MiniCalendar } from "@/components/diary/MiniCalendar";
import { SuggestionList } from "@/components/diary/SuggestionList";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { daysAwayLabel, shortDate } from "@/lib/diary/format";
import { computeGiftingScore } from "@/lib/diary/gifting-score";
import { localDateIn } from "@/lib/diary/recurrence";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { buildDiaryView } from "@/lib/diary/view";
import { EVENT_TYPE_LABEL } from "@/lib/validation/diary.schema";

export const metadata = { title: "My Gifting Diary — GiftPing" };

export default async function DiaryPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const rows = await getDiaryRows(user.id);
  const today = localDateIn(rows.timezone);
  const view = buildDiaryView({ contacts: rows.contacts, events: rows.events, gifts: rows.gifts, today });
  const score = computeGiftingScore(view.scoreInput);

  const pool = await loadCandidatePool(await createClient());
  const giftedBy = new Map<string, Set<string>>();
  for (const g of rows.gifts) if (g.contact_id && g.product_id) giftedBy.set(g.contact_id, (giftedBy.get(g.contact_id) ?? new Set()).add(g.product_id));

  const featured = view.upcoming.filter((m) => !m.handled).slice(0, 3).map((m) => ({
    moment: m,
    ideas: suggestGifts({
      person: { relationship: m.contact.relationship, interests: m.contact.interests, giftPreferences: m.contact.gift_preferences },
      context: { eventType: m.event.event_type, budgetMax: m.contact.budget_max === null ? null : Number(m.contact.budget_max) },
      candidates: pool.candidates,
      alreadyGiftedProductIds: giftedBy.get(m.contact.id),
      limit: 3,
    }),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">My Gifting Diary</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-dark/60">
            <ShieldCheck className="h-4 w-4 text-brand-primary" /> Hello {user.fullName.split(" ")[0]} — private to you, never visible to GiftPing&apos;s team.
          </p>
        </div>
        <ContactDialog trigger="add" />
      </div>

      {rows.contacts.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-dark/15 p-14 text-center">
          <Heart className="h-10 w-10 text-brand-secondary" />
          <h2 className="font-heading text-xl text-brand-dark">Never miss a moment that matters</h2>
          <p className="max-w-md text-sm text-brand-dark/60">
            Add the people you love and their important dates. We&apos;ll remind you a week ahead — and again three days before — with gift ideas picked just for them.
          </p>
          <ContactDialog trigger="add" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8">
            <section aria-labelledby="up-heading">
              <h2 id="up-heading" className="font-heading text-xl text-brand-dark">Coming up</h2>
              {view.upcoming.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-brand-dark/15 p-6 text-sm text-brand-dark/60">
                  Nothing in the next 60 days. Open a person to add a birthday or anniversary.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {view.upcoming.map((m) => (
                    <li key={m.event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><Cake className="h-5 w-5" /></span>
                        <div>
                          <Link href={`/diary/people/${m.contact.id}`} className="font-medium text-brand-dark hover:underline">{m.contact.name}</Link>
                          <p className="text-xs text-brand-dark/60">
                            {m.event.title ?? EVENT_TYPE_LABEL[m.event.event_type as keyof typeof EVENT_TYPE_LABEL] ?? m.event.event_type}
                            {m.milestone > 0 && ["birthday", "anniversary"].includes(m.event.event_type) ? ` · ${m.milestone} years` : ""} · {shortDate(m.occurrence)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.handled ? <Badge variant="primary">Gift sorted</Badge> : null}
                        <Badge variant={m.daysAway <= 7 ? "gold" : "neutral"}>{daysAwayLabel(m.daysAway)}</Badge>
                        {!m.handled ? <GiftDialog contactId={m.contact.id} contactName={m.contact.name} defaultEventType={m.event.event_type} label="Got it" /> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {featured.length > 0 ? (
              <section aria-labelledby="ideas-heading">
                <h2 id="ideas-heading" className="flex items-center gap-2 font-heading text-xl text-brand-dark"><Gift className="h-5 w-5 text-brand-secondary-dark" /> Gift ideas for what&apos;s next</h2>
                <div className="mt-3 space-y-5">
                  {featured.map(({ moment, ideas }) => (
                    <div key={moment.event.id}>
                      <p className="mb-2 text-sm text-brand-dark/70">For <span className="font-medium text-brand-dark">{moment.contact.name}</span> — {daysAwayLabel(moment.daysAway).toLowerCase()}</p>
                      <SuggestionList suggestions={ideas} pool={pool} compact />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-labelledby="people-heading">
              <h2 id="people-heading" className="font-heading text-xl text-brand-dark">Your people</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {rows.contacts.map((c) => {
                  const next = view.nextByContact.get(c.id);
                  return (
                    <li key={c.id}>
                      <Link href={`/diary/people/${c.id}`} className="block rounded-2xl border border-brand-dark/10 bg-white p-4 transition-shadow hover:shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-brand-dark">{c.name}{c.is_favorite ? " ★" : ""}</p>
                          {c.relationship ? <Badge>{c.relationship}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-brand-dark/60">
                          {next ? `${next.event.title ?? EVENT_TYPE_LABEL[next.event.event_type as keyof typeof EVENT_TYPE_LABEL] ?? next.event.event_type} · ${shortDate(next.occurrence)} (${daysAwayLabel(next.daysAway).toLowerCase()})` : "No dates saved yet"}
                        </p>
                        {c.interests.length > 0 ? <p className="mt-1 truncate text-xs text-brand-secondary-dark">{c.interests.join(" · ")}</p> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <GiftingScoreCard score={score} />
            <MiniCalendar today={today} moments={view.moments.filter((m) => m.event.is_active)} />
          </aside>
        </div>
      )}
    </div>
  );
}
