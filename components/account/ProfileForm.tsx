"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileAction } from "@/lib/account/profile-actions";
import { profileSchema, type ProfileData, type ProfileInput } from "@/lib/validation/profile.schema";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string | null; email: string }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput, unknown, ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, phone: phone ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.error) return setServerError(result.error);
      toast.success("Your details are saved.");
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" {...register("fullName")} />
        <FieldError message={errors.fullName?.message} />
      </div>
      <div>
        <Label htmlFor="phone">Contact number</Label>
        <Input id="phone" inputMode="tel" placeholder="98765 43210" {...register("phone")} />
        <FieldError message={errors.phone?.message as string | undefined} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
        <p className="mt-1 text-xs text-brand-dark/50">Your email is how you sign in and can&apos;t be changed here.</p>
      </div>
      {serverError ? <p role="alert" className="text-sm text-red-700">{serverError}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
