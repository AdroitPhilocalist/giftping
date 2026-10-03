"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Robin, type RobinPose } from "@/components/art/Robin";
import { Button } from "@/components/ui/Button";
import { BUDGETS, INTERESTS, MAX_LIKES, OCCASIONS, WHO, quizQuery, type InterestId, type QuizAnswers } from "@/lib/gift-finder/quiz";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

type StepId = "who" | "occasion" | "budget" | "likes";

const STEPS: { id: StepId; title: string; robin: RobinPose; say: string }[] = [
  { id: "who", title: "Who is the gift for?", robin: "waving", say: "Hello! Let's find something they'll love. Who are we shopping for?" },
  { id: "occasion", title: "What's the occasion?", robin: "bell", say: "Lovely. Is there a date to remember?" },
  { id: "budget", title: "How much would you like to spend?", robin: "perched", say: "Roughly what feels right? I'll keep every pick inside it." },
  { id: "likes", title: "Anything they love?", robin: "search", say: "Last one — pick up to three, or skip it and I'll surprise you." },
];

const firstUnanswered = (a: Partial<QuizAnswers>): number => (!a.who ? 0 : !a.occasion ? 1 : !a.budget ? 2 : 3);

const card = (on: boolean) =>
  cn(
    "group relative flex min-h-[3.75rem] cursor-pointer items-center justify-between gap-3 rounded-card border bg-brand-surface px-4 py-3 text-left text-sm text-brand-dark transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-secondary",
    on ? "gp-quiz-pick border-brand-secondary bg-brand-accent/60 shadow-card" : "border-brand-dark/10 hover:-translate-y-0.5 hover:border-brand-secondary/50 hover:shadow-card",
  );

/**
 * The gift-finder quiz. At heart a plain GET form to /gift-finder (so it works with no JavaScript: every question is shown and Submit searches); with
 * JavaScript it becomes one friendly question at a time — the robin asks, picking an answer moves on, there's a Back button, and the last step
 * navigates to the results URL. The answers are in that URL, so a result can be shared or bookmarked.
 *
 * `summary` is the readable recap of an existing answer set (built on the server); with `defaultOpen` false the quiz starts collapsed behind a
 * "Change my answers" button, so the results page leads with the gifts.
 */
export function GiftFinderQuiz({ initial, summary, defaultOpen }: { initial: Partial<QuizAnswers>; summary: string[]; defaultOpen: boolean }) {
  const router = useRouter();
  // false while rendering on the server and during hydration, true afterwards: the no-JavaScript experience is "everything visible", and only then do we
  // switch to one-step-at-a-time. (useSyncExternalStore is the lint-clean way to ask "has the client taken over?")
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(defaultOpen);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>(initial);
  const [step, setStep] = useState(firstUnanswered(initial));
  const [pending, startTransition] = useTransition();
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  // The page re-renders with new props after the quiz navigates to its own results URL (the component instance survives that), so when the recap changes,
  // start fresh from the new answers — collapsed on a results page, open on the bare page ("adjust state when a value changes", compared during render).
  const recapKey = `${defaultOpen}|${summary.join("|")}`;
  const [seenRecap, setSeenRecap] = useState(recapKey);
  if (recapKey !== seenRecap) {
    setSeenRecap(recapKey);
    setOpen(defaultOpen);
    setAnswers(initial);
    setStep(firstUnanswered(initial));
  }

  const likes = answers.likes ?? [];
  const current = STEPS[step];
  const complete = Boolean(answers.who && answers.occasion && answers.budget);

  function go(to: number) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, to)));
  }

  function pick<K extends "who" | "occasion" | "budget">(key: K, value: QuizAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (!enhanced) return;
    // a brief beat so the choice visibly "lands" before the next question slides in
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => go(step + 1), 260);
  }

  function toggleLike(id: InterestId) {
    setAnswers((a) => {
      const cur = a.likes ?? [];
      if (cur.includes(id)) return { ...a, likes: cur.filter((x) => x !== id) };
      return cur.length >= MAX_LIKES ? a : { ...a, likes: [...cur, id] };
    });
  }

  function submit(e: React.FormEvent) {
    if (!enhanced) return; // no JavaScript → the browser submits the form as a normal GET
    e.preventDefault();
    if (!answers.who || !answers.occasion || !answers.budget) return go(firstUnanswered(answers));
    const q = quizQuery({ who: answers.who, occasion: answers.occasion, budget: answers.budget, likes });
    startTransition(() => router.push(`/gift-finder?${q}`));
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-dark/10 bg-brand-surface p-4 shadow-card">
        <p className="text-sm text-brand-dark/80"><span className="font-medium text-brand-dark">Your answers:</span> {summary.join(" · ")}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setStep(0); }}>Change my answers</Button>
          <Button size="sm" variant="ghost" asChild><a href="/gift-finder">Start over</a></Button>
        </div>
      </div>
    );
  }

  const show = (id: StepId) => !enhanced || current.id === id;

  return (
    <form action="/gift-finder" method="get" onSubmit={submit} className="rounded-card border border-brand-secondary/25 bg-gradient-to-b from-brand-accent/50 to-brand-surface p-5 shadow-card sm:p-7" aria-busy={pending}>
      {enhanced ? (
        <div className="mb-5 flex items-center gap-4">
          <div className="w-16 shrink-0 sm:w-20"><Robin pose={current.robin} title="" /></div>
          <div className="min-w-0">
            <p key={step} className="gp-quiz-bubble rounded-2xl rounded-bl-sm bg-brand-surface px-4 py-2.5 text-sm text-brand-dark shadow-card">{pending ? "Looking through the mall for you…" : current.say}</p>
          </div>
        </div>
      ) : (
        <p className="mb-5 text-sm text-brand-dark/70">Answer the questions and press <strong>Show me gifts</strong>.</p>
      )}

      {enhanced ? (
        <div className="mb-5" role="group" aria-label="Progress">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => <span key={s.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-brand-secondary" : "bg-brand-dark/10")} />)}
          </div>
          <p className="mt-1.5 text-xs text-brand-dark/55" aria-live="polite">Question {step + 1} of {STEPS.length}</p>
        </div>
      ) : null}

      {show("who") ? (
        <fieldset key={enhanced ? `who-${step}` : "who"} className={cn("space-y-3", enhanced && "gp-quiz-in")}>
          <legend className="mb-3 font-heading text-2xl text-brand-dark">{STEPS[0].title}</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {WHO.map((w) => (
              <label key={w.id} className="relative block">
                <input type="radio" name="who" value={w.id} checked={answers.who === w.id} onChange={() => pick("who", w.id)} required={!enhanced} className="peer sr-only" />
                <span className={card(answers.who === w.id)}>
                  <span><span className="font-medium">{w.label}</span>{w.sub ? <span className="ml-1.5 text-xs text-brand-dark/50">{w.sub}</span> : null}</span>
                  {answers.who === w.id ? <Check className="h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" /> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {show("occasion") ? (
        <fieldset key={enhanced ? `occasion-${step}` : "occasion"} className={cn("space-y-3", enhanced ? "gp-quiz-in" : "mt-8")}>
          <legend className="mb-3 font-heading text-2xl text-brand-dark">{STEPS[1].title}</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {OCCASIONS.map((o) => (
              <label key={o.id} className="relative block">
                <input type="radio" name="occasion" value={o.id} checked={answers.occasion === o.id} onChange={() => pick("occasion", o.id)} required={!enhanced} className="peer sr-only" />
                <span className={card(answers.occasion === o.id)}>
                  <span className="font-medium">{o.label}</span>
                  {answers.occasion === o.id ? <Check className="h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" /> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {show("budget") ? (
        <fieldset key={enhanced ? `budget-${step}` : "budget"} className={cn("space-y-3", enhanced ? "gp-quiz-in" : "mt-8")}>
          <legend className="mb-3 font-heading text-2xl text-brand-dark">{STEPS[2].title}</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {BUDGETS.map((b) => (
              <label key={b.id} className="relative block">
                <input type="radio" name="budget" value={b.id} checked={answers.budget === b.id} onChange={() => pick("budget", b.id)} required={!enhanced} className="peer sr-only" />
                <span className={card(answers.budget === b.id)}>
                  <span className="font-medium">{b.label}</span>
                  {answers.budget === b.id ? <Check className="h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" /> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {show("likes") ? (
        <fieldset key={enhanced ? `likes-${step}` : "likes"} className={cn("space-y-3", enhanced ? "gp-quiz-in" : "mt-8")}>
          <legend className="mb-1 font-heading text-2xl text-brand-dark">{STEPS[3].title}</legend>
          <p className="text-xs text-brand-dark/55">Pick up to {MAX_LIKES} (optional) · {likes.length} chosen</p>
          <div className="flex flex-wrap gap-2.5">
            {INTERESTS.map((i) => {
              const on = likes.includes(i.id);
              const full = !on && likes.length >= MAX_LIKES;
              return (
                <label key={i.id} className={cn("relative", full && "opacity-45")}>
                  <input type="checkbox" name="likes" value={i.id} checked={on} disabled={full} onChange={() => toggleLike(i.id)} className="peer sr-only" />
                  <span className={cn(card(on), "min-h-0 rounded-full px-4 py-2", full && "cursor-not-allowed")}>
                    {on ? <Check className="h-3.5 w-3.5 text-brand-secondary-dark" aria-hidden="true" /> : null}
                    <span>{i.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className={cn("mt-7 flex flex-wrap items-center gap-3", !enhanced && "mt-8")}>
        {enhanced && step > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => go(step - 1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</Button>
        ) : null}
        {enhanced && step < STEPS.length - 1 ? (
          <Button type="button" variant="secondary" size="sm" disabled={!answers[current.id as "who" | "occasion" | "budget"]} onClick={() => go(step + 1)}>Next <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        ) : null}
        {!enhanced || step === STEPS.length - 1 ? (
          <Button type="submit" disabled={pending || (enhanced && !complete)}><Sparkles className="h-4 w-4" aria-hidden="true" /> {pending ? "Finding gifts…" : "Show me gifts"}</Button>
        ) : null}
      </div>
    </form>
  );
}
