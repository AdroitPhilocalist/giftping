import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { ContactDialog, DeleteButton, EventDialog, GiftDialog, ReminderToggle } from "@/components/diary/DiaryForms";
import { SuggestionList } from "@/components/diary/SuggestionList";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { createClient } from "@/lib/db/server";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { daysAwayLabel, longDate, shortDate } from "@/lib/diary/format";
import { localDateIn } from "@/lib/diary/recurrence";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { buildDiaryView } from "@/lib/diary/view";
import { formatCurrency } from "@/lib/utils/format";
import { EVENT_TYPE_LABEL } from "@/lib/validation/diary.schema";

export const metadata = { title: "Diary — GiftPing" };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await requireRole("customer", "vendor", "admin");
  const rows = await getDiaryRows(user.id);
  const contact = rows.contacts.find((c) => c.id === id);
  if (!contact) notFound(); // RLS means another user's id is simply not in `rows`

  const today = localDateIn(rows.timezone);
  const events = rows.events.filter((e) => e.contact_id === id);
  const gifts = rows.gifts.filter((g) => g.contact_id === id);
  const view = buildDiaryView({ contacts: [contact], events, gifts, today });
  const next = view.nextByContact.get(id);

  const pool = await loadCandidatePool(await createClient());
  const ideas = suggestGifts({
    person: { relationship: contact.relationship, interests: contact.interests, giftPreferences: contact.gift_preferences },
    context: { eventType: next?.event.event_type ?? null, budgetMax: contact.budget_max === null ? null : Number(contact.budget_max) },
    candidates: pool.candidates,
    alreadyGiftedProductIds: new Set(gifts.map((g) => g.product_id).filter((p): p is string => !!p)),
    limit: 6,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/diary" className="inline-flex items-center gap-1 text-sm text-brand-dark/60 hover:underline"><ArrowLeft className="h-4 w-4" /> Diary</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">{contact.name}{contact.is_favorite ? " ★" : ""}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-dark/60">
            {contact.relationship ? <Badge>{contact.relationship}</Badge> : null}
            {contact.budget_max ? <span>Usual budget {formatCurrency(Number(contact.budget_max))}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ContactDialog contact={contact} trigger="edit" />
          <DeleteButton kind="contact" id={contact.id} name={contact.name} />
        </div>
      </div>

      {contact.interests.length > 0 || contact.gift_preferences || contact.notes ? (
        <div className="mt-5 space-y-2 rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
          {contact.interests.length > 0 ? <p><span className="text-brand-dark/50">Interests: </span><span className="text-brand-secondary-dark">{contact.interests.join(" · ")}</span></p> : null}
          {contact.gift_preferences ? <p><span className="text-brand-dark/50">Preferences: </span>{contact.gift_preferences}</p> : null}
          {contact.notes ? <p className="text-brand-dark/70"><span className="text-brand-dark/50">Notes: </span>{contact.notes}</p> : null}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-brand-dark/15 p-4 text-sm text-brand-dark/60">Add a few interests — that&apos;s what makes the gift ideas good.</p>
      )}

      <section className="mt-8" aria-labelledby="dates-heading">
        <div className="flex items-center justify-between">
          <h2 id="dates-heading" className="font-heading text-xl text-brand-dark">Important dates</h2>
          <EventDialog contactId={contact.id} contactName={contact.name} trigger="add" />
        </div>
        {events.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-brand-dark/15 p-6 text-sm text-brand-dark/60">No dates yet — add a birthday or anniversary and we&apos;ll remind you.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((e) => {
              const m = view.moments.find((x) => x.event.id === e.id);
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4">
                  <div>
                    <p className="font-medium text-brand-dark">{e.title ?? EVENT_TYPE_LABEL[e.event_type as keyof typeof EVENT_TYPE_LABEL] ?? e.event_type}</p>
                    <p className="text-xs text-brand-dark/60">
                      {longDate(e.event_date)}{e.is_recurring ? " · every year" : ""}
                      {m ? ` · next ${shortDate(m.occurrence)} (${daysAwayLabel(m.daysAway).toLowerCase()})` : " · passed"}
                    </p>
                    <p className="text-xs text-brand-dark/50">Reminders: {e.reminder_days.length ? e.reminder_days.map((d) => `${d}d`).join(", ") + " before" : "none"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ReminderToggle id={e.id} active={e.is_active} />
                    <EventDialog contactId={contact.id} contactName={contact.name} event={e} trigger="edit" />
                    <DeleteButton kind="event" id={e.id} name="this date" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="ideas-heading">
        <h2 id="ideas-heading" className="font-heading text-xl text-brand-dark">Gift ideas for {contact.name.split(" ")[0]}</h2>
        <p className="mb-3 text-sm text-brand-dark/60">{next ? `Picked for their ${(next.event.title ?? next.event.event_type).toLowerCase()} ${daysAwayLabel(next.daysAway).toLowerCase()}.` : "Picked from what you've told us about them."}</p>
        <SuggestionList suggestions={ideas} pool={pool} />
      </section>

      <section className="mt-8" aria-labelledby="hist-heading">
        <div className="flex items-center justify-between">
          <h2 id="hist-heading" className="font-heading text-xl text-brand-dark">Gifts you&apos;ve given</h2>
          <GiftDialog contactId={contact.id} contactName={contact.name} />
        </div>
        {gifts.length === 0 ? (
          <p className="mt-3 text-sm text-brand-dark/50">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-white">
            {gifts.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium text-brand-dark">{g.gift_name ?? "Gift"}</p>
                  <p className="text-xs text-brand-dark/60">{longDate(g.gifted_at.slice(0, 10))}{g.event_type ? ` · ${EVENT_TYPE_LABEL[g.event_type as keyof typeof EVENT_TYPE_LABEL] ?? g.event_type}` : ""}{g.amount ? ` · ${formatCurrency(Number(g.amount))}` : ""}</p>
                </div>
                <DeleteButton kind="gift" id={g.id} name={g.gift_name ?? "this gift"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
