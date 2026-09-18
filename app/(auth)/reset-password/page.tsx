"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionResult } from "@/lib/auth/actions";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";

const initialState: ActionResult = {};

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Reset your password</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      {state.success ? (
        <p className="mt-6 rounded-xl bg-brand-primary/10 p-4 text-sm text-brand-primary">
          {state.success}
        </p>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton>Send reset link</SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        <Link href="/sign-in" className="font-medium text-brand-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
