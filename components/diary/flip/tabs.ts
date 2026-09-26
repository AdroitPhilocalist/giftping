/** The diary's index tabs: plain data, so both the book and the older single pages can use it. */
export type DiaryTabKey = "today" | "month" | "ideas" | "people" | "year" | "gifting" | "log";

export const TAB_META: Record<DiaryTabKey, { label: string; tone: string; /** the spread a tab opens: ?p=… ("" = the first) */ spread: string }> = {
  today: { label: "Today", tone: "var(--dy-apricot)", spread: "" },
  month: { label: "Month", tone: "var(--dy-mustard)", spread: "month" },
  ideas: { label: "Ideas", tone: "var(--dy-blush)", spread: "ideas" },
  people: { label: "People", tone: "var(--dy-sage)", spread: "people" },
  year: { label: "Year", tone: "var(--dy-sky)", spread: "year" },
  gifting: { label: "Score", tone: "var(--dy-apricot)", spread: "gifting" },
  log: { label: "Log", tone: "var(--dy-mint)", spread: "log" },
};
export const tabHref = (key: DiaryTabKey) => (TAB_META[key].spread ? `/diary?p=${TAB_META[key].spread}` : "/diary");
