import { signInHref } from "@/lib/auth/paths";

/**
 * Where a diary link should point. The real diary and the guest sample share every page component,
 * so the difference is kept here rather than sprinkled through the JSX: in preview mode people open
 * the sample person page, while deeper signed-in views (a year, a review) ask for an account and
 * then land on the real page.
 */
export function diaryPersonHref(id: string, preview = false, eventId?: string) {
  const base = preview ? `/diary/preview/people/${id}` : `/diary/people/${id}`;
  return eventId ? `${base}?event=${encodeURIComponent(eventId)}#plan` : base;
}

export function diaryYearHref(year: number, preview = false) {
  const real = `/diary/year?year=${year}`;
  return preview ? signInHref(real) : real;
}

export function diaryReviewHref(year: number, preview = false) {
  const real = `/diary/review?year=${year}`;
  return preview ? signInHref(real) : real;
}
