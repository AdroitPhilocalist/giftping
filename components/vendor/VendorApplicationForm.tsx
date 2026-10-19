"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ClipboardCheck,
  Landmark,
  MapPin,
  ReceiptText,
  Send,
} from "lucide-react";
import { registerVendorAction } from "@/lib/vendor/actions";
import {
  BUSINESS_TYPES,
  vendorApplicationSchema,
  type VendorApplication,
  type VendorApplicationInput,
} from "@/lib/validation/vendor.schema";
import { ShopfrontArt } from "@/components/art/ShopfrontArt";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

/**
 * The vendor application, as a five-step form instead of one long scroll.
 *
 * WHY STEPS: sixteen fields at once (business, tax, bank, pickup) reads like a form at a tax office — and the bank details in
 * particular arrive before the applicant has any reason to trust the page. Splitting it makes each screen one small, obvious
 * ask, lets a section be validated on its own (`trigger(fields)` — no more scrolling to find out what an error refers to), and
 * gives the page somewhere to put the thing that actually sells the idea: a LIVE PREVIEW of the boutique they are opening.
 *
 * The preview is `ShopfrontArt` — the same drawn shopfront a real boutique without a banner gets on Boutique Avenue — with the
 * name they type appearing on its sign. It is the one delight on the page and it is honest: it shows a real thing, from the real
 * components, of the business they are describing.
 *
 * WHAT IS DELIBERATELY CHANGED FROM BEFORE: nothing underneath. The same schema, the same `registerVendorAction`, the same
 * field ids (so autofill and the labels keep working) and the same values, submitted in one call at the end. The stepper is
 * presentation only — every field stays a single form state and one server round trip.
 */

type StepId = "business" | "tax" | "payout" | "pickup" | "review";

const STEPS: {
  id: StepId;
  label: string;
  title: string;
  hint: string;
  icon: typeof Building2;
  fields: FieldPath<VendorApplicationInput>[];
}[] = [
  {
    id: "business",
    label: "Business",
    title: "About your business",
    hint: "What shoppers will see on your storefront — the name, the tagline and the story behind the brand.",
    icon: Building2,
    fields: ["businessName", "businessType", "shortDescription", "description", "supportEmail", "supportPhone"],
  },
  {
    id: "tax",
    label: "Tax",
    title: "Tax details",
    hint: "The registration numbers on your invoices. We never show these to shoppers.",
    icon: ReceiptText,
    fields: ["gstin", "pan"],
  },
  {
    id: "payout",
    label: "Payout",
    title: "Where we send your earnings",
    hint: "Used only to settle orders you've fulfilled. Your account number is encrypted at rest and never shown to shoppers.",
    icon: Landmark,
    fields: ["bankAccountName", "bankAccountNumber", "bankIfsc"],
  },
  {
    id: "pickup",
    label: "Pickup",
    title: "Pickup address",
    hint: "Where couriers collect your orders. It can be your studio, home or warehouse.",
    icon: MapPin,
    fields: ["warehouseLine1", "warehouseCity", "warehouseState", "warehousePincode"],
  },
  {
    id: "review",
    label: "Review",
    title: "Review and submit",
    hint: "One look over everything before it reaches our team — you can still go back and change any section.",
    icon: ClipboardCheck,
    fields: ["acceptTerms"],
  },
];

export function VendorApplicationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  /** how far forward the applicant has been allowed, so the rail can offer a jump back to anything already seen */
  const [furthest, setFurthest] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<VendorApplicationInput, unknown, VendorApplication>({
    resolver: zodResolver(vendorApplicationSchema),
    defaultValues: { businessType: "Sole proprietorship" },
    // "onChange", so React Hook Form re-checks a field on every keystroke and a corrected value drops its error the instant it
    // becomes valid — while the applicant is still typing, not on the next tab away.
    //
    // What keeps that from shouting "Tell shoppers a little about your brand" at the first three characters of a description is
    // `seenFields` below: validation runs eagerly, but a message is only rendered for a field the applicant has actually been
    // through (or that Continue has just checked). Eager validation, patient reporting.
    mode: "onChange",
  });

  /**
   * Which fields are allowed to show an error yet: ones the applicant has tabbed out of, and every field of a step they pressed
   * Continue on. Owned here rather than read from React Hook Form's `touchedFields`, because `formState` is a mutable proxy —
   * reading it outside a render (or relying on its identity) is not something to build behaviour on.
   */
  const [seenFields, setSeenFields] = useState<ReadonlySet<string>>(() => new Set());

  function markSeen(names: readonly string[]) {
    setSeenFields((prev) => {
      if (names.every((n) => prev.has(n))) return prev;
      const next = new Set(prev);
      for (const n of names) next.add(n);
      return next;
    });
  }

  /** The message to render for a field — withheld until the applicant has met that field. */
  function error(name: FieldPath<VendorApplicationInput>, message?: string) {
    return message && seenFields.has(name) ? message : undefined;
  }

  // Subscribing to the whole form is what makes the shopfront sign and the review list live. Sixteen tiny fields — cheap.
  // `useWatch`, not `watch()`: the latter returns a function that React Compiler cannot memoize, which would silently opt this
  // whole component out of memoization (and fail lint).
  const values = useWatch({ control });
  const active = STEPS[step];
  const isLast = step === STEPS.length - 1;

  /** Moving between steps must never leave the applicant at the top of a different screen with no idea why. */
  function scrollToPanel() {
    // A plain DOM lookup rather than a ref: `onInvalid` is handed to `handleSubmit` during render, and the React Compiler
    // (rightly) refuses to let a ref be closed over on that path.
    const el = document.getElementById("vendor-application");
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  async function goNext() {
    // Continue is also the moment the applicant says "judge this step": every field in it may now show its error.
    markSeen(active.fields);
    const ok = await trigger(active.fields, { shouldFocus: true });
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setFurthest((f) => Math.max(f, Math.min(step + 1, STEPS.length - 1)));
    scrollToPanel();
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
    scrollToPanel();
  }

  function goTo(index: number) {
    if (index > furthest) return;
    setStep(index);
    scrollToPanel();
  }

  // If the final submit fails validation (only reachable if an earlier section was never confirmed — e.g. a browser autofill
  // that filled three steps at once), land on the first step that is actually wrong instead of sitting on Review with nothing.
  const onInvalid = (formErrors: FieldErrors<VendorApplicationInput>) => {
    const firstBad = STEPS.findIndex((s) => s.fields.some((f) => f in formErrors));
    if (firstBad >= 0) {
      markSeen(STEPS[firstBad].fields);
      setStep(firstBad);
      scrollToPanel();
    }
  };

  const onSubmit = handleSubmit((submitted) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerVendorAction(submitted);
      if (result.error) {
        setServerError(result.error);
        return;
      }
      toast("Application submitted — we'll review it shortly.");
      router.refresh();
    });
  }, onInvalid);

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-8 lg:grid-cols-[1fr_320px]"
      noValidate
      // Leaving a field is the other way to "meet" it, so a value that is wrong when you tab away says so — but only that one.
      onBlurCapture={(event) => {
        const { name } = event.target as HTMLElement & { name?: string };
        if (name) markSeen([name]);
      }}
    >
      <div id="vendor-application" className="min-w-0 scroll-mt-24">
        {/* ── where you are, on a phone: the rail is too wide to be useful, so it becomes one line ───────────────────────── */}
        <div className="mb-4 lg:hidden">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-secondary-dark">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-xs text-brand-dark/45">{active.label}</p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-dark/10" role="presentation">
            <div
              className="h-full rounded-full bg-brand-secondary transition-[width] duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-brand-on-primary shadow-card">
              <active.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-xl leading-snug text-brand-dark sm:text-2xl">{active.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-brand-dark/55">{active.hint}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {active.id === "business" ? (
              <>
                <div>
                  <Label htmlFor="businessName">Business / brand name</Label>
                  <Input id="businessName" {...register("businessName")} />
                  <FieldError message={error("businessName", errors.businessName?.message)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="businessType">Business type</Label>
                    <Select id="businessType" {...register("businessType")}>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shortDescription">Tagline (optional)</Label>
                    <Input id="shortDescription" placeholder="Timeless elegance, thoughtfully gifted" {...register("shortDescription")} />
                    <FieldError message={error("shortDescription", errors.shortDescription?.message)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Brand story</Label>
                  <Textarea id="description" rows={5} {...register("description")} />
                  <FieldError message={error("description", errors.description?.message)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="supportEmail">Customer support email</Label>
                    <Input id="supportEmail" type="email" {...register("supportEmail")} />
                    <FieldError message={error("supportEmail", errors.supportEmail?.message)} />
                  </div>
                  <div>
                    <Label htmlFor="supportPhone">Support mobile number</Label>
                    <Input id="supportPhone" inputMode="numeric" maxLength={10} {...register("supportPhone")} />
                    <FieldError message={error("supportPhone", errors.supportPhone?.message)} />
                  </div>
                </div>
              </>
            ) : null}

            {active.id === "tax" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input id="gstin" className="uppercase" maxLength={15} {...register("gstin")} />
                  <FieldError message={error("gstin", errors.gstin?.message)} />
                </div>
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input id="pan" className="uppercase" maxLength={10} {...register("pan")} />
                  <FieldError message={error("pan", errors.pan?.message)} />
                </div>
              </div>
            ) : null}

            {active.id === "payout" ? (
              <>
                <div>
                  <Label htmlFor="bankAccountName">Account holder name</Label>
                  <Input id="bankAccountName" {...register("bankAccountName")} />
                  <FieldError message={error("bankAccountName", errors.bankAccountName?.message)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="bankAccountNumber">Account number</Label>
                    <Input id="bankAccountNumber" inputMode="numeric" autoComplete="off" {...register("bankAccountNumber")} />
                    <FieldError message={error("bankAccountNumber", errors.bankAccountNumber?.message)} />
                  </div>
                  <div>
                    <Label htmlFor="bankIfsc">IFSC</Label>
                    <Input id="bankIfsc" className="uppercase" maxLength={11} {...register("bankIfsc")} />
                    <FieldError message={error("bankIfsc", errors.bankIfsc?.message)} />
                  </div>
                </div>
              </>
            ) : null}

            {active.id === "pickup" ? (
              <>
                <div>
                  <Label htmlFor="warehouseLine1">Address</Label>
                  <Input id="warehouseLine1" {...register("warehouseLine1")} />
                  <FieldError message={error("warehouseLine1", errors.warehouseLine1?.message)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="warehouseCity">City</Label>
                    <Input id="warehouseCity" {...register("warehouseCity")} />
                    <FieldError message={error("warehouseCity", errors.warehouseCity?.message)} />
                  </div>
                  <div>
                    <Label htmlFor="warehouseState">State</Label>
                    <Input id="warehouseState" {...register("warehouseState")} />
                    <FieldError message={error("warehouseState", errors.warehouseState?.message)} />
                  </div>
                  <div>
                    <Label htmlFor="warehousePincode">Pincode</Label>
                    <Input id="warehousePincode" inputMode="numeric" maxLength={6} {...register("warehousePincode")} />
                    <FieldError message={error("warehousePincode", errors.warehousePincode?.message)} />
                  </div>
                </div>
              </>
            ) : null}

            {active.id === "review" ? (
              <div className="space-y-3">
                <ReviewRow label="Business" onEdit={() => goTo(0)} rows={[
                  ["Brand name", values.businessName],
                  ["Type", values.businessType],
                  ["Tagline", values.shortDescription],
                  ["Support", [values.supportEmail, values.supportPhone].filter(Boolean).join(" · ")],
                ]} />
                <ReviewRow label="Tax" onEdit={() => goTo(1)} rows={[["GSTIN", values.gstin], ["PAN", values.pan]]} />
                <ReviewRow label="Payout" onEdit={() => goTo(2)} rows={[
                  ["Account holder", values.bankAccountName],
                  ["Account number", maskAccount(values.bankAccountNumber)],
                  ["IFSC", values.bankIfsc],
                ]} />
                <ReviewRow label="Pickup" onEdit={() => goTo(3)} rows={[
                  ["Address", values.warehouseLine1],
                  ["City", values.warehouseCity],
                  ["State", values.warehouseState],
                  ["Pincode", values.warehousePincode],
                ]} />

                <div className="rounded-card border border-brand-dark/[0.07] bg-brand-accent/40 p-4">
                  <p className="font-heading text-base text-brand-dark">What happens next</p>
                  <p className="mt-1 text-sm leading-relaxed text-brand-dark/65">
                    A human on the GiftPing team reads every application before a boutique goes live — usually within a day or two. You&apos;ll see the
                    decision on this page and in your notifications, and you can start adding products the moment it&apos;s approved.
                  </p>
                </div>

                <label className="flex items-start gap-3 text-sm text-brand-dark/75">
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-primary" {...register("acceptTerms")} />
                  <span>
                    I confirm these details are accurate and agree to the GiftPing{" "}
                    {/* A new tab on purpose: opening them in this one would throw away a half-filled application. */}
                    <Link
                      href="/vendor/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-secondary-dark underline underline-offset-2 hover:text-brand-secondary"
                    >
                      vendor terms
                    </Link>{" "}
                    and commission structure.
                  </span>
                </label>
                <FieldError message={error("acceptTerms", errors.acceptTerms?.message)} />
              </div>
            ) : null}
          </div>

          {serverError ? (
            <p role="alert" className="mt-5 rounded-button bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-brand-dark/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0} className={cn(step === 0 && "invisible")}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            {isLast ? (
              <Button type="submit" size="lg" disabled={isPending} className="sm:min-w-56">
                {isPending ? "Submitting…" : "Submit application"}
                {isPending ? null : <Send className="h-4 w-4" aria-hidden="true" />}
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={goNext} className="sm:min-w-56">
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-brand-dark/45 sm:text-right">
            {isLast ? "Nothing is published until our team approves it." : `${step + 1} of ${STEPS.length} — your answers are kept between steps.`}
          </p>
        </div>
      </div>

      {/* ── the sidebar: the boutique you are opening, and how far along you are ─────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-card border border-brand-dark/[0.06] shadow-card">
          <div className="relative aspect-[4/3] bg-gradient-to-b from-brand-primary-dark to-brand-primary">
            <ShopfrontArt name={values.businessName?.trim() ? values.businessName : undefined} />
          </div>
          <div className="bg-brand-surface px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-secondary-dark">Your shopfront</p>
            <p className="mt-1.5 font-heading text-lg leading-snug text-brand-dark">{values.businessName?.trim() || "Your boutique"}</p>
            <p className="mt-0.5 text-xs text-brand-dark/55">{values.shortDescription?.trim() || values.businessType || "A tagline goes here"}</p>
          </div>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-brand-dark/50">
          Drawn as you type. Once you&apos;re approved you&apos;ll upload your own shopfront photo, banner and logo.
        </p>

        <ol className="mt-6 hidden space-y-1 lg:block">
          {STEPS.map((s, i) => {
            // `furthest` is how far the applicant has been ALLOWED to go, so a section they have already passed reads as done
            // even after they step back to re-read an earlier one.
            const state = i === step ? "current" : i < furthest ? "done" : "todo";
            const reachable = i <= furthest;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={!reachable}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-button px-3 py-2 text-left text-sm transition-colors",
                    i === step ? "bg-brand-accent/70 text-brand-dark" : reachable ? "text-brand-dark/70 hover:bg-brand-accent/40" : "text-brand-dark/35",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                      state === "done" ? "bg-brand-primary text-brand-on-primary" : state === "current" ? "bg-brand-secondary text-brand-on-secondary" : "border border-brand-dark/15 text-brand-dark/40",
                    )}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-5 hidden items-start gap-2 text-xs leading-relaxed text-brand-dark/50 lg:flex">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary" strokeWidth={1.7} aria-hidden="true" />
          Every application is reviewed by our team. Nothing you enter here is shown to shoppers until your boutique is approved.
        </p>
      </aside>
    </form>
  );
}

/** A section of the review screen: what was entered, with a way straight back to it. */
function ReviewRow({ label, onEdit, rows }: { label: string; onEdit: () => void; rows: [string, unknown][] }) {
  // `unknown` because the three preprocessed fields (GSTIN, PAN, IFSC) have an `unknown` INPUT type — see vendor.schema.ts.
  const shown = rows.map(([k, v]) => [k, typeof v === "string" ? v.trim() : ""] as const).filter(([, v]) => v.length > 0);
  return (
    <div className="rounded-card border border-brand-dark/[0.07] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-base text-brand-dark">{label}</p>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-brand-secondary-dark underline underline-offset-2 hover:text-brand-secondary">
          Edit
        </button>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {shown.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-sm">
            <dt className="shrink-0 text-brand-dark/45">{k}</dt>
            <dd className="min-w-0 truncate text-brand-dark/80">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Never reprint a full account number on a screen someone may be sharing — last four only. */
function maskAccount(account?: string) {
  const digits = (account ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}
