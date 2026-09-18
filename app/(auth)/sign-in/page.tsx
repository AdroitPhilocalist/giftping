"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInAction, type ActionResult } from "@/lib/auth/actions";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { GoogleButton } from "@/components/auth/GoogleButton";

const initialState: ActionResult = {};

function SignInForm() {
  const [state, formAction] = useActionState(signInAction, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/reset-password" className="text-xs text-brand-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Welcome back</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Sign in to continue to GiftPing.</p>

      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>

      <div className="my-6 flex items-center gap-3 text-xs text-brand-dark/40">
        <span className="h-px flex-1 bg-brand-dark/10" />
        OR
        <span className="h-px flex-1 bg-brand-dark/10" />
      </div>

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        New to GiftPing?{" "}
        <Link href="/sign-up" className="font-medium text-brand-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
