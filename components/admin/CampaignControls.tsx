"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  cancelCampaignAction,
  deleteDraftAction,
  pauseCampaignAction,
  requeueFailedAction,
  resumeCampaignAction,
  sendNextBatchAction,
  sendTestEmailAction,
  startCampaignAction,
} from "@/lib/admin/campaign-actions";

type Result = { error?: string; message?: string };

export function CampaignControls({ id, status, failed, startSummary }: { id: string; status: string; failed: number; startSummary: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<Result>, opts: { confirm?: string; after?: "list" } = {}) {
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    startTransition(async () => {
      const result = await action();
      if (result.error) return void toast.error(result.error);
      if (result.message) toast.success(result.message);
      if (opts.after === "list") router.push("/admin/campaigns");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => sendTestEmailAction(id))}>Send me a test</Button>
      {status === "draft" ? (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => startCampaignAction(id), { confirm: `${startSummary}\n\nStart sending? Only people still opted in at their turn will be emailed, and this can't be undone for emails already sent.` })}>Start sending…</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteDraftAction(id), { confirm: "Delete this draft?", after: "list" })}>Delete draft</Button>
        </>
      ) : null}
      {status === "sending" ? (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => sendNextBatchAction(id))}>Send next batch now</Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => pauseCampaignAction(id))}>Pause</Button>
        </>
      ) : null}
      {status === "paused" ? <Button size="sm" disabled={pending} onClick={() => run(() => resumeCampaignAction(id))}>Resume</Button> : null}
      {status === "sending" || status === "paused" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelCampaignAction(id), { confirm: "Cancel this campaign? Anyone not yet emailed will not be." })}>Cancel campaign</Button>
      ) : null}
      {failed > 0 && status !== "draft" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => requeueFailedAction(id), { confirm: `Retry ${failed} failed ${failed === 1 ? "email" : "emails"}? If an earlier attempt actually got through, that person will receive it twice.` })}>Retry {failed} failed</Button>
      ) : null}
    </div>
  );
}
