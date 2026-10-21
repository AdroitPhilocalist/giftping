import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { CorporateEnquiryControls } from "@/components/admin/CorporateEnquiryControls";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { listCorporateEnquiries } from "@/lib/db/corporate-enquiries";
import {
  CORPORATE_BUDGET_RANGE_LABELS,
  CORPORATE_ENQUIRY_STATUSES,
  CORPORATE_ENQUIRY_STATUS_LABELS,
  CORPORATE_GIFTING_NEED_LABELS,
  CORPORATE_QUANTITY_RANGE_LABELS,
  type CorporateBudgetRange,
  type CorporateEnquiryStatus,
  type CorporateGiftingNeed,
  type CorporateQuantityRange,
} from "@/lib/validation/corporate-enquiry.schema";

export const metadata = { title: "Corporate enquiries — GiftPing Admin" };

const BADGE: Record<CorporateEnquiryStatus, BadgeVariant> = {
  new: "gold",
  contacted: "progress",
  quoted: "shipped",
  won: "done",
  lost: "neutral",
};

const asStatus = (value: string): CorporateEnquiryStatus =>
  (CORPORATE_ENQUIRY_STATUSES as readonly string[]).includes(value) ? (value as CorporateEnquiryStatus) : "new";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

const deliveryLabel = (date: string | null) =>
  date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" }) : "Not specified";

export default async function AdminCorporateEnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("admin");
  const { status } = await searchParams;
  const active = status && (CORPORATE_ENQUIRY_STATUSES as readonly string[]).includes(status) ? (status as CorporateEnquiryStatus) : null;
  const enquiries = await listCorporateEnquiries();
  const visible = active ? enquiries.filter((enquiry) => enquiry.status === active) : enquiries;
  const counts = Object.fromEntries(CORPORATE_ENQUIRY_STATUSES.map((value) => [value, enquiries.filter((enquiry) => enquiry.status === value).length])) as Record<CorporateEnquiryStatus, number>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Corporate enquiries</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-dark/60">
          Briefs submitted from the corporate-gifting page. Move each one through the pipeline as you reply, quote and close.
        </p>
      </div>

      <nav aria-label="Filter corporate enquiries by status" className="flex flex-wrap gap-2">
        <Link href="/admin/corporate-enquiries" className={`rounded-full border px-3 py-1 text-xs ${active === null ? "border-brand-primary bg-brand-primary text-white" : "border-brand-dark/15 text-brand-dark hover:bg-brand-accent"}`}>
          All {enquiries.length}
        </Link>
        {CORPORATE_ENQUIRY_STATUSES.map((value) => (
          <Link key={value} href={`/admin/corporate-enquiries?status=${value}`} className={`rounded-full border px-3 py-1 text-xs ${active === value ? "border-brand-primary bg-brand-primary text-white" : "border-brand-dark/15 text-brand-dark hover:bg-brand-accent"}`}>
            {CORPORATE_ENQUIRY_STATUS_LABELS[value]} {counts[value]}
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-dark/15 p-10 text-center text-sm text-brand-dark/50">
          {active ? `Nothing ${CORPORATE_ENQUIRY_STATUS_LABELS[active].toLowerCase()} right now.` : "No corporate enquiries yet. New briefs will appear here and in the notification bell."}
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((enquiry) => {
            const statusValue = asStatus(enquiry.status);
            return (
              <li key={enquiry.id} className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-xl text-brand-dark">{enquiry.company_name}</h2>
                      <Badge variant={BADGE[statusValue]}>{CORPORATE_ENQUIRY_STATUS_LABELS[statusValue]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-brand-dark/60">
                      {enquiry.contact_name} · <a href={`mailto:${enquiry.work_email}`} className="underline underline-offset-2 hover:text-brand-secondary-dark">{enquiry.work_email}</a> ·{" "}
                      <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-brand-secondary-dark"><Phone className="h-3 w-3" aria-hidden="true" />{enquiry.phone}</a>
                    </p>
                  </div>
                  <p className="text-xs text-brand-dark/40">Received {dateLabel(enquiry.created_at)}</p>
                </div>

                <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs uppercase tracking-wide text-brand-dark/40">Gifting for</dt><dd className="text-brand-dark/80">{CORPORATE_GIFTING_NEED_LABELS[enquiry.gifting_need as CorporateGiftingNeed] ?? enquiry.gifting_need}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-brand-dark/40">Quantity</dt><dd className="text-brand-dark/80">{CORPORATE_QUANTITY_RANGE_LABELS[enquiry.quantity_range as CorporateQuantityRange] ?? enquiry.quantity_range}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-brand-dark/40">Budget per gift</dt><dd className="text-brand-dark/80">{CORPORATE_BUDGET_RANGE_LABELS[enquiry.budget_range as CorporateBudgetRange] ?? enquiry.budget_range}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-brand-dark/40">Delivery</dt><dd className="text-brand-dark/80">{enquiry.delivery_city ?? "City not specified"} · {deliveryLabel(enquiry.delivery_date)}</dd></div>
                </dl>

                {enquiry.branding_requirements ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-brand-dark/40">Branding / personalisation</p>
                    <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-brand-dark/75">{enquiry.branding_requirements}</p>
                  </div>
                ) : null}
                {enquiry.message ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-brand-dark/40">Their note</p>
                    <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-brand-dark/75">{enquiry.message}</p>
                  </div>
                ) : null}

                <CorporateEnquiryControls id={enquiry.id} status={statusValue} internalNote={enquiry.internal_note} />

                <a href={`mailto:${enquiry.work_email}?subject=${encodeURIComponent(`Your GiftPing corporate gifting brief — ${enquiry.company_name}`)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-secondary-dark underline underline-offset-2 hover:text-brand-secondary">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Reply by email
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
