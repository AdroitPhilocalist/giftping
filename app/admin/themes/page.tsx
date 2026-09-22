import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { ThemePreviewPanel } from "@/components/admin/ThemePreviewPanel";
import { ThemeScheduleDialog, type ThemeScheduleFormValues } from "@/components/admin/ThemeScheduleDialog";
import { ThemeScheduleRowActions } from "@/components/admin/ThemeScheduleRowActions";
import { Badge } from "@/components/ui/Badge";
import { istDate } from "@/lib/admin/coupons";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { resolveTheme, schedulableThemes, THEMES } from "@/lib/theme/themes";
import { getThemePreviewOverride } from "@/lib/theme/preview";
import { themeScheduleStatus } from "@/lib/theme/schedule";

export const metadata = { title: "Themes — GiftPing Admin" };
const VARIANT = { live: "primary", paused: "neutral", scheduled: "gold", expired: "neutral" } as const;

export default async function AdminThemesPage() {
  await requireRole("admin");
  const [{ data: schedules }, previewing] = await Promise.all([
    // The admin's own session: RLS (is_admin) lets them see paused/scheduled/expired rows the public can't.
    (await createClient()).from("site_themes").select("*").order("starts_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    getThemePreviewOverride(),
  ]);
  const festivals = schedulableThemes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Themes</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          The native look is GiftPing&apos;s everyday theme. A festival theme sits on top of it for a set window (like Christmas) and turns itself on and off by date — nothing to remember on the day.
        </p>
      </div>

      <ThemePreviewPanel themes={Object.values(THEMES)} previewing={previewing} />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl text-brand-dark">Scheduled themes</h2>
          {festivals.length > 0 ? <ThemeScheduleDialog themes={festivals} /> : null}
        </div>

        {festivals.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-dashed border-brand-dark/15 p-10 text-center">
            <PartyPopper className="h-8 w-8 text-brand-dark/25" />
            <p className="max-w-sm text-sm text-brand-dark/55">
              No festival theme has been built yet — the panel above lets you see the mechanism with the demo themes. Ask for one (Christmas, Diwali…) and it will appear here to schedule, with its own artwork and colours, once it&apos;s built.
            </p>
            <Link href="/design" className="text-xs font-medium text-brand-secondary-dark underline underline-offset-2">See the live style sheet</Link>
          </div>
        ) : !schedules || schedules.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-brand-dark/15 p-10 text-center text-sm text-brand-dark/55">Nothing scheduled yet — the site shows the native look until you add one.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-dark/10 overflow-hidden rounded-card border border-brand-dark/10 bg-brand-surface">
            {schedules.map((s) => {
              const status = themeScheduleStatus({ isActive: s.is_active, startsAt: s.starts_at, endsAt: s.ends_at });
              const label = resolveTheme(s.theme_id).label;
              const form: ThemeScheduleFormValues = { id: s.id, themeId: s.theme_id, note: s.note ?? "", startsOn: istDate(s.starts_at), endsOn: istDate(s.ends_at), isActive: s.is_active };
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-dark">
                      {label} <Badge variant={VARIANT[status]}>{status}</Badge>
                    </p>
                    <p className="text-xs text-brand-dark/60">
                      {[s.note, s.starts_at && `from ${istDate(s.starts_at)}`, s.ends_at && `until ${istDate(s.ends_at)}`].filter(Boolean).join(" · ") || "No dates set — runs until paused."}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <ThemeScheduleDialog themes={festivals} initial={form} />
                    <ThemeScheduleRowActions id={s.id} active={s.is_active} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
