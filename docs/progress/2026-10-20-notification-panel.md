# The notification bell, rebuilt as a tray (20 Oct 2026)

**Report:** *"The UI of the notification panel is pretty bad please improve it."*

The bell dropdown was the last surface that hadn't been through the design pass: a `.paper` card with
full-bleed dividers, every non-diary notification wearing the same generic Gift icon, 11px timestamps at
40% ink, "View all reminders →" as the footer of a *notifications* inbox, "Opening your notifications…"
forever if the action threw, and no empty state beyond a sentence in the middle of nothing. The panel and
the full inbox also disagreed about where an unread dot goes.

It is now a **tray of slips**: a peach header band (bell mark, serif title, `N unread`, and *Mark all as
read* as a real menu item, so it takes part in keyboard navigation) over inset, rounded rows, with the way
to the inbox and to notification settings at the foot.

## The rows

`components/notifications/notificationVisual.ts` is the single type→presentation map, shared by the bell and
the inbox, so an order never wears a different mark in the two places:

- orders → parcel; shipments → van; refunds → banknote; returns → rotate arrow; payouts → wallet; vendor
  decisions → storefront; admin notes → megaphone; welcome → sparkle; everything unknown → the bell.
- diary reminders keep their actual occasion sticker, which was already the nicest thing in the old panel.
- roundel tints are brand tokens only — peach, deep green, copper. A notification is not an error, so none
  of it borrows the danger red (the small unread *badge* on the bell stays red, as it already was).

Unread reads as three quiet signals instead of one loud one: a warm tint on the slip, a semibold title, and
a copper dot pinned to the row's right edge (with a soft halo) so a short title doesn't end in a speck.
Messages clamp to two lines in the tray; the full inbox keeps the whole message, since reading it is the
point. Timestamps are 11px at 65% ink (5.4:1, up from ~2.7:1).

## The states the old panel didn't have

- **Loading:** three skeleton slips. Verified under a 1.2s CDP latency throttle, not just assumed.
- **Empty:** the robin on a bell, then the honest sentence. Checked on `demo.priya`, who has zero
  notifications; the bulk action and the count are absent, the footer still works.
- **Error:** `recentNotificationsAction` can throw; the panel now says so and offers *Try again* instead of
  sitting on "Opening your notifications…" forever.

*Mark all as read* only appears once there are rows to look at, then clears the count, the action and every
dot **before** the server round-trip; it puts them back if the write fails. A refresh that lands mid-request
re-applies the read state, so a row can't come back dotted after the write succeeded.

## Small things that matter

- The footer now says **Open inbox** (it opens `/notifications`, not reminders) and adds the gear that goes
  to `/account/notifications` — the account menu already linked there, but the panel was a dead end.
- The scrolling list gets a hairline copper scrollbar (`.gp-scroll-thin` in `app/globals.css`, which is
  allowed root-layout CSS) instead of the platform's grey stripe over the paper.
- The header **wraps** below ~380px rather than truncating "Notifications"; the list height reserves the
  wrapped header and footer, so the tray always fits. Measured: 1440×1000 → 538px tall, all five rows, no
  scroll; 360×640 → 548px tall, bottom at 622, list scrolls, title intact.
- The inbox at `/notifications` now shares the row anatomy and icon language, and carries a one-line
  subtitle: *Order updates, diary reminders, and notes from the team* — a summary of the types `notifyUser`
  actually writes, not a new promise.

## Verified live

Signed in as `test-customer`, at 1440 / 390 / 360: five rows fit on desktop, the list scrolls on the small
phone, no horizontal overflow, no clipped title. Keyboard: the menu takes focus on open, ArrowDown reaches
the rows, Escape closes it and returns focus to the bell. *Mark all as read* clears the badge, count, action
and dots in the same frame; the database confirmed 0 unread afterwards, and reopening resets from the
server. Clicking a row marks it read and lands on its `link_url` (`/orders`); the footer links land on
`/notifications` and `/account/notifications`. Zero console errors. Contrast checked, not eyeballed:
timestamps 5.4:1, copper on the band 5.4–5.9:1, body copy 4.5:1.

585/585 tests, `tsc`/`eslint` clean, `next build` clean.

The four varied notifications used for the screenshots were deleted afterwards, and the test customer's
seven unread were restored; nothing in the dev database was left changed.
