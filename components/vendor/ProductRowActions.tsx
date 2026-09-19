"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductActiveAction } from "@/lib/vendor/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function ProductRowActions({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status === "pending") return null;
  const isHidden = status === "inactive" || status === "rejected";

  function toggle() {
    startTransition(async () => {
      const result = await setProductActiveAction(productId, isHidden);
      if (result.error) {
        toast(result.error);
        return;
      }
      toast(isHidden ? "Sent for review — it'll go live once approved." : "Product hidden from the mall.");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={isPending} onClick={toggle}>
      {isHidden ? "Resubmit" : "Hide"}
    </Button>
  );
}
