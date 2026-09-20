const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-27" -> "27 Sep". String maths only, so no timezone can shift the day. */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function daysAwayLabel(days: number): string {
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
}
