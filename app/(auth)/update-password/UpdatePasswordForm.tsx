"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ActionResult } from "@/lib/auth/actions";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";

const initialState: ActionResult = {};

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
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
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
