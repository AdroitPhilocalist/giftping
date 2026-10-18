# 18 Oct 2026 — Password reset was always "expired": the code exchange happened in the wrong place

## The symptom
"Forgot password" → email → click the link → the "Choose a new password" form **does** appear → type a new
password → **"Couldn't update your password. Your reset link may have expired."** every time, for a link that
was seconds old.

## Root cause
The recovery link's PKCE `code` was exchanged inside a **Server Component**
(`app/(auth)/update-password/page.tsx`, an `async` page). Supabase's exchange has to **persist the new session
into cookies** — but Next.js only lets a **Route Handler** or a **Server Action** write cookies. During a
Server Component render, `cookies().set()` throws `ReadonlyRequestCookiesError` ("Cookies can only be modified
in a Server Action or Route Handler"), and `lib/db/server.ts`'s `setAll` swallows that error on purpose so a
render never crashes.

So the exchange "succeeded" in memory — `getUser()` returned the user on that same client, which is why the form
rendered — but **no session cookie was ever written to the browser**. The form posts to `updatePasswordAction`,
which runs in a *brand-new* request; it reads the request's cookies, finds **no session**, and
`supabase.auth.updateUser()` fails with "auth session missing". The action translates any error into the
"link may have expired" message — so a perfectly valid link always looked expired after submitting.

This was never an expiry problem or a Supabase misconfiguration; the link, the PKCE verifier cookie, and the
exchange all worked. Only the *session* produced by the exchange was being dropped.

## The fix
Route the recovery link through the already-proven cookie-safe landing point, **`/auth/callback`** (a Route
Handler, and the same URL Google OAuth and e-mail confirmation already use — so it is already on the Supabase
Redirect-URLs allow-list; no dashboard change needed).

1. `lib/auth/actions.ts` — `resetPasswordForEmail` now redirects to `…/auth/callback?next=/update-password`
   (was `…/update-password`).
2. `app/auth/callback/route.ts` — when `next` is `/update-password` it treats the link as a **recovery**:
   exchanges the code (writing the session cookies, which a Route Handler is allowed to do) and redirects
   straight to `/update-password`, **skipping the sign-up-only side effects** (marketing-consent pickup and the
   welcome e-mail — those belong to a freshly created account, not a password reset). An expired/invalid link
   (`error`/`error_code` params, no `code`) now goes back to `/update-password?error=expired` instead of
   `sign-in?error=…`.
3. `app/(auth)/update-password/page.tsx` — no longer exchanges anything. It just reads the session (already in
   the cookies by now) and either shows the form or the "Link expired" state, which now also offers a
   **"Request a new link"** link (it previously dead-ended with no way forward).

## Why `next` (and not the code) is the recovery signal
Verified against the live Supabase project: its `/verify` endpoint preserves an existing query string on
`redirect_to` and puts **errors in the URL fragment** (`#error=…&error_code=otp_expired`), which never reaches
the server. A Route Handler can therefore never see a hash — so the handler keys off the **query string**
(`code` for success, `next=/update-password` to know it is a recovery, and their absence for the expired case).

## Verified
- `tsc --noEmit`, `eslint`, `npm test` (565/565), `npm run build` — all clean.
- Live against the running dev server: `/auth/callback?next=/update-password` (with and without Supabase's
  `error_code=otp_expired`) → **307 → `/update-password?error=expired`**; `/auth/callback` (no recovery) →
  **307 → `/sign-in?error=auth_callback_failed`**; `/update-password` and `/update-password?error=expired`
  both render the "Link expired" state with the new "Request a new link" link.
- Live against the real Supabase project: the `/verify` redirect shape (query preserved, errors in the
  fragment), confirming the handler's assumptions above.

## Not verified here
The final email click-through in a real browser (needs a real inbox and a live session; the environment can't
receive the recovery e-mail). The mechanism is otherwise identical to the sign-up-confirmation and Google-OAuth
paths, which already exchange their code through this same `/auth/callback` handler and work.

## Note on cross-device links
Because this is the PKCE flow, the code verifier lives in a cookie set when the request was made — so the reset
link is expected to be opened **in the same browser** it was requested from. Opening it on another device/
browser would fail the exchange (shown as "Link expired"). That is inherent to PKCE recovery; if cross-device
support is wanted later, switch the e-mail template to the `{{ .TokenHash }}` + `verifyOtp({ type: "recovery" })`
style in a dedicated `/auth/confirm` Route Handler.
