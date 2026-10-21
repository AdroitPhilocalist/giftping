"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { submitCorporateEnquiryAction } from "@/lib/corporate/enquiry-actions";
import {
  CORPORATE_BUDGET_RANGES,
  CORPORATE_BUDGET_RANGE_LABELS,
  CORPORATE_GIFTING_NEEDS,
  CORPORATE_GIFTING_NEED_LABELS,
  CORPORATE_QUANTITY_RANGES,
  CORPORATE_QUANTITY_RANGE_LABELS,
  corporateEnquirySchema,
  type CorporateEnquiryData,
  type CorporateEnquiryInput,
} from "@/lib/validation/corporate-enquiry.schema";

export function CorporateEnquiryForm({ minDeliveryDate }: { minDeliveryDate: string }) {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CorporateEnquiryInput, unknown, CorporateEnquiryData>({
    resolver: zodResolver(corporateEnquirySchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      workEmail: "",
      phone: "",
      giftingNeed: undefined,
      quantityRange: undefined,
      budgetRange: undefined,
      deliveryCity: "",
      deliveryDate: "",
      brandingRequirements: "",
      message: "",
      consent: false,
      website: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitCorporateEnquiryAction(values);
      if (!result.success) {
        setServerError(result.error ?? "We couldn't send your brief. Please try again.");
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (message) setError(field as keyof CorporateEnquiryInput, { message });
        }
        return;
      }
      setSuccess(true);
      reset();
    });
  });

  if (success) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-[28rem] flex-col items-center justify-center rounded-[1.5rem] border border-brand-primary/15 bg-brand-surface px-6 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="mt-5 font-heading text-2xl text-brand-dark">Your brief is with us.</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-dark/65">
          Our corporate gifting team will read it and reply by email. If you need to add anything, just send another note through the form.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="secondary" onClick={() => setSuccess(false)}>
            Send another brief
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">Contact us <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[1.5rem] border border-brand-dark/[0.08] bg-brand-surface p-5 shadow-card sm:p-7">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-secondary-dark">Your brief</p>
        <h3 className="mt-2 font-heading text-2xl text-brand-dark">Tell us what you have in mind.</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/60">
          A few details help us come back with a useful shortlist and a clear quote, not a generic catalogue.
        </p>
      </div>

      {serverError ? (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyName">Company <span className="text-brand-secondary">*</span></Label>
          <Input id="companyName" autoComplete="organization" placeholder="Acme India" aria-invalid={Boolean(errors.companyName)} {...register("companyName")} />
          <FieldError message={errors.companyName?.message} />
        </div>
        <div>
          <Label htmlFor="contactName">Your name <span className="text-brand-secondary">*</span></Label>
          <Input id="contactName" autoComplete="name" placeholder="Asha Nair" aria-invalid={Boolean(errors.contactName)} {...register("contactName")} />
          <FieldError message={errors.contactName?.message} />
        </div>
        <div>
          <Label htmlFor="workEmail">Work email <span className="text-brand-secondary">*</span></Label>
          <Input id="workEmail" type="email" autoComplete="email" placeholder="asha@acme.com" aria-invalid={Boolean(errors.workEmail)} {...register("workEmail")} />
          <FieldError message={errors.workEmail?.message} />
        </div>
        <div>
          <Label htmlFor="phone">Phone <span className="text-brand-secondary">*</span></Label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="giftingNeed">What are you gifting for? <span className="text-brand-secondary">*</span></Label>
          <Select id="giftingNeed" aria-invalid={Boolean(errors.giftingNeed)} {...register("giftingNeed")}>
            <option value="">Choose one</option>
            {CORPORATE_GIFTING_NEEDS.map((need) => <option key={need} value={need}>{CORPORATE_GIFTING_NEED_LABELS[need]}</option>)}
          </Select>
          <FieldError message={errors.giftingNeed?.message} />
        </div>
        <div>
          <Label htmlFor="quantityRange">How many gifts? <span className="text-brand-secondary">*</span></Label>
          <Select id="quantityRange" aria-invalid={Boolean(errors.quantityRange)} {...register("quantityRange")}>
            <option value="">Choose a range</option>
            {CORPORATE_QUANTITY_RANGES.map((range) => <option key={range} value={range}>{CORPORATE_QUANTITY_RANGE_LABELS[range]}</option>)}
          </Select>
          <FieldError message={errors.quantityRange?.message} />
        </div>
        <div>
          <Label htmlFor="budgetRange">Budget per gift <span className="text-brand-secondary">*</span></Label>
          <Select id="budgetRange" aria-invalid={Boolean(errors.budgetRange)} {...register("budgetRange")}>
            <option value="">Choose a range</option>
            {CORPORATE_BUDGET_RANGES.map((range) => <option key={range} value={range}>{CORPORATE_BUDGET_RANGE_LABELS[range]}</option>)}
          </Select>
          <FieldError message={errors.budgetRange?.message} />
        </div>
        <div>
          <Label htmlFor="deliveryCity">Delivery city</Label>
          <Input id="deliveryCity" autoComplete="address-level2" placeholder="Bengaluru" {...register("deliveryCity")} />
          <FieldError message={errors.deliveryCity?.message} />
        </div>
        <div>
          <Label htmlFor="deliveryDate">When do you need them? <span className="font-normal text-brand-dark/45">(optional)</span></Label>
          <Input id="deliveryDate" type="date" min={minDeliveryDate} {...register("deliveryDate")} />
          <FieldError message={errors.deliveryDate?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="brandingRequirements">Branding or personalisation</Label>
          <Textarea id="brandingRequirements" rows={3} placeholder="Logo on the box, names on notebooks, a note from leadership…" {...register("brandingRequirements")} />
          <FieldError message={errors.brandingRequirements?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="message">Anything else we should know?</Label>
          <Textarea id="message" rows={4} placeholder="Recipients, destinations, a preferred delivery date, or the story behind the gift." {...register("message")} />
          <FieldError message={errors.message?.message} />
        </div>
      </div>

      {/* Honeypot. A person never sees or focuses this; bots that fill every field give themselves away. */}
      <div className="pointer-events-none absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="mt-5 rounded-xl border border-brand-dark/[0.07] bg-brand-light/70 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-brand-dark/70">
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-dark/25 accent-brand-secondary" aria-invalid={Boolean(errors.consent)} {...register("consent")} />
          <span>
            I&apos;m happy to be contacted about this enquiry. We&apos;ll use these details only to respond to this brief — see our{" "}
            <Link href="/privacy" className="font-medium text-brand-secondary-dark underline underline-offset-2">Privacy Policy</Link>.
          </span>
        </label>
        <FieldError message={errors.consent?.message} />
      </div>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-brand-dark/45">We reply by email, usually with a shortlist and a quote.</p>
        <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          {isPending ? "Sending your brief…" : "Request a proposal"}
        </Button>
      </div>
    </form>
  );
}
