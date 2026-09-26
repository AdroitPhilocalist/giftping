import { redirect } from "next/navigation";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { YearSpread } from "@/components/diary/year/YearSpread";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { summariseYear } from "@/lib/diary/memories";
import { toMonthData } from "@/lib/diary/page-data";
import { localDateIn } from "@/lib/diary/recurrence";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "The year at a glance — GiftPing" };

export default async function DiaryYearPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireRole("customer", "vendor", "admin");
  const [rows, theme, params] = await Promise.all([getDiaryRows(user.id), getActiveTheme(), searchParams]);
  if (rows.contacts.length === 0) redirect("/diary"); // an empty diary starts on its front page
  if (params.year === undefined) redirect("/diary?p=year"); // this year is a spread of the diary book itself; other years keep this page

  const today = localDateIn(rows.timezone);
  const asked = Number(params.year);
  const year = Number.isInteger(asked) && asked >= 1900 && asked <= 2200 ? asked : Number(today.slice(0, 4));
  const months = toMonthData(rows.events, rows.contacts, year);
  const summary = summariseYear({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today, year });

  return (
    <DiaryDesk>
      <YearSpread year={year} today={today} months={months} summary={summary} themeId={theme.id} />
    </DiaryDesk>
  );
}
