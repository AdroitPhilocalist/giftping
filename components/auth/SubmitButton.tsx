"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full" {...props}>
      {pending ? <Spinner className="h-4 w-4 text-current" /> : children}
    </Button>
  );
}
