"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerVendorAction } from "@/lib/vendor/actions";
import {
  BUSINESS_TYPES,
  vendorApplicationSchema,
  type VendorApplication,
  type VendorApplicationInput,
} from "@/lib/validation/vendor.schema";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-5">
      <legend className="px-1 font-heading text-lg text-brand-dark">{title}</legend>
      {hint ? <p className="-mt-2 text-xs text-brand-dark/50">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

export function VendorApplicationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorApplicationInput, unknown, VendorApplication>({
    resolver: zodResolver(vendorApplicationSchema),
    defaultValues: { businessType: "Sole proprietorship" },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerVendorAction(values);
      if (result.error) {
        setServerError(result.error);
        return;
      }
      toast("Application submitted — we'll review it shortly.");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="About your business">
        <div>
          <Label htmlFor="businessName">Business / brand name</Label>
          <Input id="businessName" {...register("businessName")} />
          <FieldError message={errors.businessName?.message} />
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
            <FieldError message={errors.shortDescription?.message} />
          </div>
        </div>
        <div>
          <Label htmlFor="description">Brand story</Label>
          <Textarea id="description" {...register("description")} />
          <FieldError message={errors.description?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="supportEmail">Customer support email</Label>
            <Input id="supportEmail" type="email" {...register("supportEmail")} />
            <FieldError message={errors.supportEmail?.message} />
          </div>
          <div>
            <Label htmlFor="supportPhone">Support mobile number</Label>
            <Input id="supportPhone" inputMode="numeric" maxLength={10} {...register("supportPhone")} />
            <FieldError message={errors.supportPhone?.message} />
          </div>
        </div>
      </Section>

      <Section title="Tax details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" className="uppercase" maxLength={15} {...register("gstin")} />
            <FieldError message={errors.gstin?.message} />
          </div>
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" className="uppercase" maxLength={10} {...register("pan")} />
            <FieldError message={errors.pan?.message} />
          </div>
        </div>
      </Section>

      <Section title="Payout bank account" hint="Used only to settle your earnings. Your account number is encrypted and never shown to shoppers.">
        <div>
          <Label htmlFor="bankAccountName">Account holder name</Label>
          <Input id="bankAccountName" {...register("bankAccountName")} />
          <FieldError message={errors.bankAccountName?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bankAccountNumber">Account number</Label>
            <Input id="bankAccountNumber" inputMode="numeric" autoComplete="off" {...register("bankAccountNumber")} />
            <FieldError message={errors.bankAccountNumber?.message} />
          </div>
          <div>
            <Label htmlFor="bankIfsc">IFSC</Label>
            <Input id="bankIfsc" className="uppercase" maxLength={11} {...register("bankIfsc")} />
            <FieldError message={errors.bankIfsc?.message} />
          </div>
        </div>
      </Section>

      <Section title="Pickup address" hint="Where couriers collect your orders.">
        <div>
          <Label htmlFor="warehouseLine1">Address</Label>
          <Input id="warehouseLine1" {...register("warehouseLine1")} />
          <FieldError message={errors.warehouseLine1?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="warehouseCity">City</Label>
            <Input id="warehouseCity" {...register("warehouseCity")} />
            <FieldError message={errors.warehouseCity?.message} />
          </div>
          <div>
            <Label htmlFor="warehouseState">State</Label>
            <Input id="warehouseState" {...register("warehouseState")} />
            <FieldError message={errors.warehouseState?.message} />
          </div>
          <div>
            <Label htmlFor="warehousePincode">Pincode</Label>
            <Input id="warehousePincode" inputMode="numeric" maxLength={6} {...register("warehousePincode")} />
            <FieldError message={errors.warehousePincode?.message} />
          </div>
        </div>
      </Section>

      <label className="flex items-start gap-2 text-sm text-brand-dark/70">
        <input type="checkbox" className="mt-1 h-4 w-4" {...register("acceptTerms")} />
        <span>I confirm these details are accurate and agree to the GiftPing vendor terms and commission structure.</span>
      </label>
      <FieldError message={errors.acceptTerms?.message} />

      {serverError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p> : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
