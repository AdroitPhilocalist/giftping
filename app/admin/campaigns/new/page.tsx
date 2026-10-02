import Link from "next/link";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { requireRole } from "@/lib/auth/session";
import { audienceCounts } from "@/lib/marketing/audience";

export const metadata = { title: "New campaign — GiftPing Admin" };

export default async function NewCampaignPage() {
  await requireRole("admin");
  const counts = await audienceCounts();
  return (
    <div className="max-w-2xl">
      <Link href="/admin/campaigns" className="text-sm text-brand-dark/60 hover:underline">← Campaigns</Link>
      <h1 className="mt-2 font-heading text-3xl text-brand-dark">New campaign</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Write it, send yourself a test, then start it. Nothing is sent until you press <em>Start sending</em>.</p>
      <div className="mt-6"><CampaignForm counts={counts} /></div>
    </div>
  );
}
