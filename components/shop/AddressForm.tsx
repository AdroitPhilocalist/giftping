"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveAddressAction } from "@/lib/account/address-actions";
import type { SavedAddress } from "@/lib/db/addresses";
import {
  ADDRESS_LABELS,
  INDIAN_STATES,
  addressSchema,
  type AddressData,
  type AddressInput,
} from "@/lib/validation/address.schema";

export function AddressForm({
  address,
  isFirst,
  onSaved,
  onCancel,
}: {
  address?: SavedAddress;
  isFirst?: boolean;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput, unknown, AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          label: (ADDRESS_LABELS as readonly string[]).includes(address.label ?? "") ? (address.label as "Home") : "Other",
          recipientName: address.recipient_name,
          phone: address.phone,
          addressLine1: address.address_line1,
          addressLine2: address.address_line2 ?? "",
          landmark: address.landmark ?? "",
          city: address.city,
          state: address.state as (typeof INDIAN_STATES)[number],
          pincode: address.pincode,
          isDefault: address.is_default,
        }
      : { label: "Home", isDefault: false },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveAddressAction(values, address?.id);
      if (result.error || !result.id) {
        setServerError(result.error ?? "Couldn't save that address.");
        return;
      }
      onSaved(result.id);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-card border border-brand-dark/10 bg-brand-light p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="recipientName">Recipient&apos;s name</Label>
          <Input id="recipientName" autoComplete="name" {...register("recipientName")} />
          <FieldError message={errors.recipientName?.message} />
        </div>
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...register("phone")} />
          <FieldError message={errors.phone?.message as string | undefined} />
        </div>
      </div>
      <div>
        <Label htmlFor="addressLine1">Flat / house no., street</Label>
        <Input id="addressLine1" autoComplete="address-line1" {...register("addressLine1")} />
        <FieldError message={errors.addressLine1?.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="addressLine2">Area / locality (optional)</Label>
          <Input id="addressLine2" autoComplete="address-line2" {...register("addressLine2")} />
        </div>
        <div>
          <Label htmlFor="landmark">Landmark (optional)</Label>
          <Input id="landmark" {...register("landmark")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" {...register("pincode")} />
          <FieldError message={errors.pincode?.message} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" autoComplete="address-level2" {...register("city")} />
          <FieldError message={errors.city?.message} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Select id="state" defaultValue="" autoComplete="address-level1" {...register("state")}>
            <option value="" disabled>
              Choose…
            </option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <FieldError message={errors.state?.message} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Select aria-label="Address type" className="w-28" {...register("label")}>
            {ADDRESS_LABELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
          {isFirst ? null : (
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input type="checkbox" className="h-4 w-4 rounded border-brand-dark/20" {...register("isDefault")} />
              Make default
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save address"}
          </Button>
        </div>
      </div>
      {serverError ? <p className="text-sm text-red-700">{serverError}</p> : null}
    </form>
  );
}
