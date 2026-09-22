import Link from "next/link";
import { Cake, Gift, ShieldCheck } from "lucide-react";
import { HeroBackdrop } from "@/components/art/HeroBackdrop";
import { Robin } from "@/components/art/Robin";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { Jaali } from "@/components/ornaments/Jaali";
import { ContactDialog, GiftDialog } from "@/components/diary/DiaryForms";
import { GiftingScoreCard } from "@/components/diary/GiftingScoreCard";
import { MiniCalendar } from "@/components/diary/MiniCalendar";
import { SuggestionList } from "@/components/diary/SuggestionList";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { daysAwayLabel, deskDate, shortDate } from "@/lib/diary/format";
import { computeGiftingScore } from "@/lib/diary/gifting-score";
import { localDateIn } from "@/lib/diary/recurrence";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { buildDiaryView } from "@/lib/diary/view";
import { EVENT_TYPE_LABEL } from "@/lib/validation/diary.schema";

export const metadata = { title: "My Gifting Diary — GiftPing" };

export default async function DiaryPage() {
  const user = await requireRole("customer", "vendor", "admin");
  // rows/pool/theme don't depend on each other — fetch together.
  const [rows, pool, theme] = await Promise.all([getDiaryRows(user.id), loadCandidatePool(await createClient()), getActiveTheme()]);
  const today = localDateIn(rows.timezone);
  const view = buildDiaryView({ contacts: rows.contacts, events: rows.events, gifts: rows.gifts, today });
  const score = computeGiftingScore(view.scoreInput);
  const desk = siteImage("diary-desk", theme.id);

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
      <section className="relative overflow-hidden rounded-card border border-brand-secondary/20 bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent">
        {desk ? <HeroBackdrop image={desk} priority /> : <Jaali className="opacity-[0.07]" />}
        <div className="relative grid items-center gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rise">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">{deskDate(today)}</p>
            <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl">
              {user.fullName.split(" ")[0]}&apos;s <span className="accent-word">Gifting Diary</span>
            </h1>
            <p className="mt-3 flex max-w-xl items-start gap-2 text-sm leading-relaxed text-brand-dark/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              Private to you. Not even GiftPing&apos;s team can open it.
            </p>
            <div className="mt-5"><ContactDialog trigger="add" /></div>
          </div>
          {desk ? null : (
            <div className="hidden items-end gap-2 md:flex" aria-hidden="true">
              <Robin className="float-slow w-24" />
              <GiftBoxArt tone="copper" className="-ml-4 w-24" />
            </div>
          )}
        </div>
      </section>

      {rows.contacts.length === 0 ? (
        <div className="paper mt-8 flex flex-col items-center gap-3 rounded-card border border-brand-secondary/25 p-10 text-center shadow-card sm:p-14">
          <Robin pose="peeking" className="w-32" />
          <h2 className="font-heading text-xl text-brand-dark">Never miss a moment that matters</h2>
          <p className="max-w-md text-sm text-brand-dark/60">
            Add the people you love and their important dates. We&apos;ll remind you a week ahead — and again three days before — with gift ideas picked just for them.
          </p>
          <ContactDialog trigger="add" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8">
            <section aria-labelledby="up-heading">
              <h2 id="up-heading" className="font-heading text-2xl text-brand-dark">Coming up</h2>
              {view.upcoming.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-brand-dark/15 p-6 text-sm text-brand-dark/60">
                  Nothing in the next 60 days. Open a person to add a birthday or anniversary.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {view.upcoming.map((m) => (
                    <li key={m.event.id} className="paper flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-dark/10 p-3 pr-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                      <div className="flex items-center gap-4">
                        <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-button border border-brand-secondary/30 bg-brand-surface text-center shadow-sm" aria-hidden="true">
                          <span className="w-full bg-brand-secondary py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-on-secondary">{shortDate(m.occurrence).split(" ")[1]}</span>
                          <span className="font-heading text-2xl leading-none text-brand-dark">{shortDate(m.occurrence).split(" ")[0]}</span>
                        </span>
                        <div>
                          <Link href={`/diary/people/${m.contact.id}`} className="font-heading text-lg text-brand-dark hover:underline">{m.contact.name}</Link>
                          <p className="flex items-center gap-1.5 text-xs text-brand-dark/60">
                            <Cake className="h-3.5 w-3.5 text-brand-secondary" aria-hidden="true" />
                            {m.event.title ?? EVENT_TYPE_LABEL[m.event.event_type as keyof typeof EVENT_TYPE_LABEL] ?? m.event.event_type}
                            {m.milestone > 0 && ["birthday", "anniversary"].includes(m.event.event_type) ? ` · ${m.milestone} years` : ""}
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
              <h2 id="people-heading" className="font-heading text-2xl text-brand-dark">Your people</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {rows.contacts.map((c) => {
                  const next = view.nextByContact.get(c.id);
                  return (
                    <li key={c.id}>
                      <Link href={`/diary/people/${c.id}`} className="block rounded-card border border-brand-dark/10 bg-brand-surface p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
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
