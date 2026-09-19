"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveProductAction,
  approveVendorAction,
  rejectProductAction,
  rejectVendorAction,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

export function DecisionButtons({ kind, id }: { kind: "vendor" | "product"; id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function decide(run: () => Promise<{ error?: string }>, done: string) {
    startTransition(async () => {
      const result = await run();
      if (result.error) {
        toast(result.error);
        return;
      }
      toast(done);
      setRejecting(false);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          decide(() => (kind === "vendor" ? approveVendorAction(id) : approveProductAction(id)), "Approved")
        }
      >
        Approve
      </Button>
      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setRejecting(true)}>
        Reject
      </Button>

      <Modal
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject this ${kind}`}
        description="The reason is sent to the applicant, so keep it clear and constructive."
      >
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What needs to change?" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              decide(() => (kind === "vendor" ? rejectVendorAction(id, reason) : rejectProductAction(id, reason)), "Rejected")
            }
          >
            Send rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
