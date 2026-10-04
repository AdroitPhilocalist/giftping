"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GIFT_GIVEN_EVENT } from "@/components/orders/OrderCelebration";
import { toast } from "@/components/ui/Toast";
import { deletePlanAction, savePlanAction, setPlanStatusAction } from "@/lib/diary/actions";
import { PLAN_COPY, PLAN_STEPS, nextStatus, stepIndex, type PlanStatus } from "@/lib/diary/plans";
import { daysLabel } from "@/lib/diary/present";
import { DateRibbon } from "../DateRibbon";
import { OccasionSticker } from "../art/OccasionSticker";
import { Sprig } from "../art/Sprig";
import { HeartDoodle } from "../art/Doodles";
import { PlanIcon } from "./PlanIcons";
import { WaxSeal } from "../art/WaxSeal";
import { cn } from "@/lib/utils/cn";

export interface PlanViewData {
  eventId: string;
  occasionDate: string;
  /** "Mom's birthday" */
  heading: string;
  dateLabel: string;
  daysAway: number;
  plan: null | {
    id: string;
    /** what the tracker shows (an order for the chosen gift lifts it to "ordered") */
    status: PlanStatus;
    giftName: string | null;
    productId: string | null;
    productSlug: string | null;
    note: string | null;
    image: string | null;
    orderId: string | null;
    orderNumber: string | null;
  };
}

/**
 * The gift plan for the next occasion: Idea → Chosen → Ordered → Wrapped → Given, on a strip of paper. Tap a step to move the plan there, or use the
 * button for the next one. "Ordered" fills itself in when a real GiftPing order for the chosen gift exists (and links to its tracking); "Given" also
 * writes the gift into the person's history so next year's reminder can say what you gave.
 */
export function PlanSheet({ data, personName }: { data: PlanViewData; personName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [own, setOwn] = useState("");
  const plan = data.plan;
  // Only true for the moment THIS screen marked it given. PersonSpread remounts PlanSheet (its `key` includes the status) the instant the status changes,
  // so plain component state set inside the click handler would be erased before the stamped seal ever painted. A one-shot sessionStorage flag survives
  // that remount; reading it clears it immediately, so a later visit (or reload) never replays the stamp.
  const [justGiven] = useState(() => {
    if (!plan) return false;
    const key = `dy-just-given:${plan.id}`;
    try {
      if (sessionStorage.getItem(key) !== "1") return false;
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false; // private browsing / storage blocked — the stamp just doesn't show, nothing else breaks
    }
  });
  const [note, setNote] = useState(data.plan?.note ?? "");
  const current = plan?.status ?? null;
  const next = current ? nextStatus(current) : null;

  const run = (fn: () => Promise<{ error?: string }>, done?: string, celebrate = false) =>
    startTransition(async () => {
      const result = await fn();
      if (result.error) return void toast.error(result.error);
      if (done) toast.success(done);
      if (celebrate) {
        window.dispatchEvent(new Event(GIFT_GIVEN_EVENT)); // the robin's small celebration
        if (plan) try { sessionStorage.setItem(`dy-just-given:${plan.id}`, "1"); } catch { /* the seal just won't stamp */ }
      }
      router.refresh();
    });

  const start = () => run(() => savePlanAction({ eventId: data.eventId, occasionDate: data.occasionDate }), "Plan started.");
  const setStatus = (status: PlanStatus) => plan && status !== plan.status && run(() => setPlanStatusAction(plan.id, status), status === "given" ? `Lovely — ${personName} will remember it.` : undefined, status === "given");
  const saveOwn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!own.trim()) return;
    run(() => savePlanAction({ eventId: data.eventId, occasionDate: data.occasionDate, giftName: own.trim(), note: plan?.note ?? null }), "Saved to your plan.");
    setOwn("");
  };
  const saveNote = () => plan && note.trim() !== (plan.note ?? "") && run(() => savePlanAction({ eventId: data.eventId, occasionDate: data.occasionDate, note: note.trim() || null }));

  return (
    <section id="plan" aria-labelledby="plan-h" className="dy-note dy-note--cream relative scroll-mt-24 px-4 pb-5 pt-6 sm:px-6" style={{ ["--torn" as string]: "var(--dy-torn-4)", ["--tilt" as string]: "-0.5deg" }}>
      <span className="dy-tape dy-tape--sage" style={{ top: "-0.6rem", left: "12%" }} aria-hidden="true" />
      <span className="dy-tape dy-tape--blush" style={{ top: "-0.6rem", right: "10%", ["--tape-rot" as string]: "5deg" }} aria-hidden="true" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="plan-h" className="dy-h">Plan for {data.heading} <HeartDoodle className="text-[0.62em]" /></h2>
        <span className="flex items-center gap-2.5"><span className="dy-cap">{data.dateLabel}</span><DateRibbon daysAway={data.daysAway} label={data.daysAway <= 0 ? "Today!" : `in ${daysLabel(data.daysAway)}`} size="sm" /></span>
      </div>

      {!plan ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-3 text-center">
          <p className="dy-hand max-w-md text-[1.35rem] leading-[1.15]">Nothing planned yet. Pick one of the ideas below, or start a plan and write your own.</p>
          <button type="button" className="dy-btn dy-btn--copper" onClick={start} disabled={pending}>{pending ? "Starting…" : "Start a plan"} <span aria-hidden="true">→</span></button>
        </div>
      ) : (
        <>
          <ol className="dy-plan-rail mt-4" aria-label="Gift plan progress">
            {PLAN_STEPS.map((s, i) => {
              const state = i < stepIndex(plan.status) ? "done" : i === stepIndex(plan.status) ? "now" : "todo";
              const sub = s === "chosen" && plan.giftName ? plan.giftName : s === "ordered" && plan.orderNumber ? `Order ${plan.orderNumber}` : PLAN_COPY[s].todo;
              return (
                <li key={s}>
                  <button type="button" className="dy-plan-step w-full" data-state={state} onClick={() => setStatus(s)} disabled={pending} aria-current={state === "now" ? "step" : undefined} aria-label={`${PLAN_COPY[s].title}${state === "done" ? " (done)" : state === "now" ? " (current step)" : ""}`}>
                    <span className="dy-plan-card">
                      <PlanIcon step={s} className="dy-plan-icon h-11 w-11" />
                      <span className="dy-hand-b text-[1.35rem] leading-none">{PLAN_COPY[s].title}</span>
                      <span className="dy-hand line-clamp-2 text-left text-[1.02rem] leading-[1.05] text-[var(--dy-ink-soft)] md:min-h-[2.1rem] md:text-center">{sub}</span>
                    </span>
                    <span className="dy-plan-track" aria-hidden="true">
                      {i > 0 ? <span className="dy-plan-line dy-plan-line--l" data-on={i <= stepIndex(plan.status)} /> : null}
                      {i < PLAN_STEPS.length - 1 ? <span className="dy-plan-line dy-plan-line--r" data-on={i < stepIndex(plan.status)} /> : null}
                      <span className="dy-plan-dot relative z-[1]">{state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 grid items-start gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              {plan.giftName ? (
                <div className="flex items-center gap-3">
                  <span className="dy-polaroid !p-[3px] block w-14 shrink-0" style={{ ["--tilt" as string]: "-3deg" }}>
                    <span className="dy-polaroid-photo relative block">{plan.image ? <Image src={plan.image} alt="" fill sizes="56px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-[var(--dy-paper-lo)]"><OccasionSticker type="other" className="h-8 w-8" /></span>}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="dy-cap">Your gift</p>
                    <p className="dy-hand-b break-words text-[1.4rem] leading-[1.05]">{plan.productSlug ? <Link href={`/products/${plan.productSlug}`} className="hover:text-[var(--gp-copper)]">{plan.giftName}</Link> : plan.giftName}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={saveOwn} className="flex flex-wrap items-center gap-2">
                  <label htmlFor="plan-own" className="dy-hand-b text-[1.25rem]">Write your own idea</label>
                  <input id="plan-own" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={120} placeholder="Jasmine candle…" className="dy-field !w-auto min-w-[10rem] flex-1" />
                  <button type="submit" className="dy-btn dy-btn--sm" disabled={pending || !own.trim()}>Save</button>
                </form>
              )}
              <div>
                <label htmlFor="plan-note" className="dy-cap">Why this one?</label>
                <input id="plan-note" value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} maxLength={300} placeholder={`e.g. ${personName} loves the scent`} className="dy-field dy-hand !min-h-0 !py-1 !text-[1.2rem]" />
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {next ? (
                <button type="button" className={cn("dy-btn dy-btn--lg dy-btn--sprig", next === "given" ? "" : "dy-btn--copper")} onClick={() => setStatus(next)} disabled={pending}>{PLAN_COPY[next].action} <span aria-hidden="true">→</span></button>
              ) : justGiven ? (
                <span className="flex items-center gap-2.5" role="img" aria-label="Given with love">
                  <WaxSeal size={52} animate tone="green"><Check className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" /></WaxSeal>
                  <span className="dy-hand-b text-[1.5rem] text-[var(--gp-primary)]">Given with love</span>
                </span>
              ) : (
                <p className="dy-hand-b inline-flex items-center gap-2 text-[1.5rem] text-[var(--gp-primary)]"><Check className="h-5 w-5" aria-hidden="true" /> Given with love</p>
              )}
              {plan.orderId ? <Link href={`/orders/${plan.orderId}`} className="dy-link inline-flex items-center gap-1.5 md:self-end"><Truck className="h-4 w-4" aria-hidden="true" /> Track order →</Link> : null}
              <button type="button" className="dy-cap self-end underline-offset-2 hover:underline" onClick={() => run(() => deletePlanAction(plan.id), "Plan removed.")} disabled={pending}>Clear plan</button>
            </div>
          </div>
        </>
      )}
      <Sprig variant="wild" className="dy-corner !absolute -right-1 -bottom-2 hidden h-20 w-10 sm:block" />
    </section>
  );
}
