"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl! border! border-brand-dark/10! bg-brand-dark! text-brand-light! shadow-lg!",
          description: "text-brand-light/70!",
        },
      }}
    />
  );
}

export { toast } from "sonner";
