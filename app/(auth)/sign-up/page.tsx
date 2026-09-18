"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionResult } from "@/lib/auth/actions";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { GoogleButton } from "@/components/auth/GoogleButton";

const initialState: ActionResult = {};

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Create your account</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Join GiftPing to shop, save your Gifting Diary, and never miss a moment.
      </p>

      {state.success ? (
        <p className="mt-6 rounded-xl bg-brand-primary/10 p-4 text-sm text-brand-primary">
          {state.success}
        </p>
      ) : (
        <>
          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            <SubmitButton>Create account</SubmitButton>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-brand-dark/40">
            <span className="h-px flex-1 bg-brand-dark/10" />
            OR
            <span className="h-px flex-1 bg-brand-dark/10" />
          </div>

          <GoogleButton />
        </>
      )}

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
