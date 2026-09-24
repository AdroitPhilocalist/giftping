"use client";

import { Check, Pin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { savePlanAction } from "@/lib/diary/actions";

/** "Pick this": puts a gift idea into the plan for the occasion (or shows that it already is the pick). */
export function PickButton({ eventId, occasionDate, productId, picked, personName }: { eventId: string; occasionDate: string; productId: string; picked: boolean; personName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (picked) return <span className="dy-hand inline-flex items-center gap-1 text-[1.1rem] text-[var(--gp-primary)]"><Check className="h-4 w-4" aria-hidden="true" /> Your pick</span>;
  return (
    <button
      type="button"
      className="dy-link relative z-[2] inline-flex items-center gap-1"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await savePlanAction({ eventId, occasionDate, productId });
        if (result.error) return void toast.error(result.error);
        toast.success(`Added to ${personName}'s plan.`);
        router.refresh();
      })}
    >
      <Pin className="h-3.5 w-3.5" aria-hidden="true" /> {pending ? "Adding…" : "Pick this"}
    </button>
  );
}
