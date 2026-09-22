import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/session";
import { isThemeId } from "@/lib/theme/themes";

export const THEME_PREVIEW_COOKIE = "gp_theme_preview";

/**
 * The admin-only "preview a theme" override: a cookie that only ever takes effect for an admin session,
 * checked fresh on every read — never trusted from the cookie's presence alone. If someone who isn't an
 * admin sets this cookie by hand, it's simply ignored (a cosmetic no-op, never worth denying the request
 * over). Session-cached with React `cache()` since both `getActiveTheme()` and the layout's "you're
 * previewing" strip need it on the same request.
 */
export const getThemePreviewOverride = cache(async function getThemePreviewOverride(): Promise<string | null> {
  const value = (await cookies()).get(THEME_PREVIEW_COOKIE)?.value;
  if (!value || !isThemeId(value)) return null;
  const user = await getServerUser();
  return user?.role === "admin" ? value : null;
});
