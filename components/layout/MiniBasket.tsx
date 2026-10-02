"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BasketIcon } from "@/components/art/BasketIcon";
import { ADD_TO_CART_FLY_EVENT, type AddToCartFlyDetail } from "@/components/motion/CartFlyLayer";
import { DeliveryRibbon } from "@/components/shop/DeliveryRibbon";
import { LiveBasket } from "@/components/shop/LiveBasket";
import { ProductImage } from "@/components/shop/ProductImage";
import { Button } from "@/components/ui/Button";
import { canShowMiniBasket } from "@/lib/shop/mini-basket-env";
import { displayKeys, withAddedLine, type AddedItem, type MiniBasket as MiniBasketData } from "@/lib/shop/basket";
import { formatCurrency } from "@/lib/utils/format";

const LIST_LINES = 4;
const AUTO_CLOSE_MS = 4500;

/**
 * The header's basket icon. Click still goes straight to the basket page (and that is all a touch device or keyboard user gets). With a real mouse on
 * a desktop screen it also opens a small basket under the icon — on hover, and automatically for a few seconds right after something is added, so the
 * shopper SEES their gift land in the basket. The contents load on demand from /api/cart/mini (nothing extra on ordinary page loads). The panel is
 * rendered through a portal so no header clipping or stacking context can cut it off.
 */
export function MiniBasket({ cartCount, iconClass, badgeClass }: { cartCount: number; iconClass: string; badgeClass: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [data, setData] = useState<MiniBasketData | null>(null);
  /** the display key of the tile that should drop in (the item just added) */
  const [highlight, setHighlight] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  /** true while what's shown is only the item we were told about, before the real cart has arrived */
  const [provisionalOnly, setProvisionalOnly] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<MiniBasketData | null>(null);
  const hovering = useRef(false);
  const openedAt = useRef(0);

  const commit = useCallback((next: MiniBasketData) => {
    latest.current = next;
    setData(next);
  }, []);

  // Navigating anywhere closes it ("adjust state when a value changes", compared during render).
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const clearTimers = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (autoTimer.current) clearTimeout(autoTimer.current);
    closeTimer.current = null;
    autoTimer.current = null;
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/mini", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      commit((await res.json()) as MiniBasketData);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [commit]);

  const show = useCallback(
    (added: boolean, item?: AddedItem) => {
      clearTimers();
      const rect = linkRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 12, right: Math.max(8, window.innerWidth - rect.right - 8) });
      setJustAdded(added);
      // Only an add-triggered open needs the "pointer was already here" grace period; a hover-triggered one is already about the pointer.
      openedAt.current = added ? Date.now() : 0;
      setProvisionalOnly(Boolean(item));
      if (item) {
        // Show the gift that was just added RIGHT AWAY from what the product page knew; the real cart replaces it a moment later (same tile keys, so nothing re-animates).
        const provisional = withAddedLine(latest.current, item);
        commit(provisional);
        setHighlight(displayKeys(provisional.lines).at(-1));
      } else {
        setHighlight(undefined);
      }
      setOpen(true);
      // The auto-close countdown starts only once the real cart has arrived (so a slow connection can't close it before anything useful showed),
      // and never while the shopper's pointer is on it.
      void load().finally(() => {
        setProvisionalOnly(false);
        if (added && !hovering.current) autoTimer.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
      });
    },
    [clearTimers, commit, load],
  );

  const scheduleClose = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hovering.current = false;
    closeTimer.current = setTimeout(() => setOpen(false), 280);
  }, []);

  // After a product is added the gift flies to the icon (~0.7s); then the basket opens and shows it landing.
  useEffect(() => {
    function onAdded(e: Event) {
      if (!canShowMiniBasket()) return;
      const item = (e as CustomEvent<AddToCartFlyDetail>).detail?.added;
      clearTimers();
      autoTimer.current = setTimeout(() => show(true, item), 650);
    }
    window.addEventListener(ADD_TO_CART_FLY_EVENT, onAdded);
    return () => window.removeEventListener(ADD_TO_CART_FLY_EVENT, onAdded);
  }, [clearTimers, show]);

  // Escape or a click elsewhere closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !linkRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => clearTimers, [clearTimers]);

  const lines = data?.lines ?? [];
  const keys = displayKeys(lines);
  const rows = lines.map((l, i) => ({ l, key: keys[i] }));
  const listed = [...rows].reverse().slice(0, LIST_LINES); // newest first
  const unlisted = Math.max(0, lines.length - listed.length);
  const hasProblem = lines.some((l) => l.problem);

  return (
    <>
      <Link
        ref={linkRef}
        id="gp-cart-icon"
        href="/cart"
        aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
        className={iconClass}
        onMouseEnter={() => {
          if (!canShowMiniBasket()) return;
          hovering.current = true;
          show(false);
        }}
        onMouseLeave={scheduleClose}
      >
        <BasketIcon className="h-5 w-5" />
        {cartCount > 0 ? <span className={badgeClass}>{cartCount > 99 ? "99+" : cartCount}</span> : null}
      </Link>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Your basket"
              className="gp-mini-basket fixed z-[60] w-[min(22rem,calc(100vw-1rem))] rounded-card border border-brand-dark/10 bg-brand-surface p-4 shadow-lift"
              style={{ top: pos.top, right: pos.right }}
              onMouseMove={() => {
                // Only real MOVEMENT over the panel means "the shopper is looking at it". A pointer that merely sits where the panel appeared (it opens under the
                // Add to cart button, and grows when the cart arrives) makes the browser fire a fresh "enter" — that must not keep it open forever.
                if (hovering.current || Date.now() - openedAt.current < 700) return;
                hovering.current = true;
                if (closeTimer.current) clearTimeout(closeTimer.current);
                if (autoTimer.current) clearTimeout(autoTimer.current);
              }}
              onMouseLeave={scheduleClose}
            >
              {data === null ? (
                <p className="py-6 text-center text-sm text-brand-dark/55">{failed ? "Couldn't load your basket just now." : "Opening your basket…"}</p>
              ) : data.itemCount === 0 ? (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <div className="w-24"><LiveBasket items={[]} label="An empty basket" /></div>
                  <p className="font-heading text-lg text-brand-dark">Your basket is empty</p>
                  <Link href="/mall" className="text-sm text-brand-primary underline">Find a gift in the mall</Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <LiveBasket items={rows.map(({ l, key }) => ({ id: key, name: l.name, imageUrl: l.imageUrl, quantity: l.quantity }))} animateOnMount={justAdded && !highlight} highlightId={justAdded ? highlight : undefined} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-lg leading-tight text-brand-dark">{justAdded ? "Added to your basket" : "Your basket"}</p>
                      <p className="text-sm text-brand-dark/60">{provisionalOnly ? "Updating your basket…" : `${data.itemCount} ${data.itemCount === 1 ? "item" : "items"} · ${formatCurrency(data.subtotal)}`}</p>
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-brand-dark/10">
                    {listed.map(({ l, key }) => (
                      <li key={key}>
                        <Link href={`/products/${l.slug}`} className="flex items-center gap-3 py-2 hover:opacity-80">
                          <ProductImage src={l.imageUrl} alt="" sizes="40px" className="h-10 w-10 shrink-0 rounded-md" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-brand-dark">{l.name}</span>
                            <span className="block text-xs text-brand-dark/55">{l.problem ? <span className="text-red-700">Needs your attention</span> : `${l.quantity} × ${formatCurrency(l.lineTotal / Math.max(1, l.quantity))}`}</span>
                          </span>
                          <span className="shrink-0 text-sm font-medium text-brand-dark">{formatCurrency(l.lineTotal)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {unlisted > 0 ? <p className="mt-1 text-xs text-brand-dark/55">…and {unlisted} more in your basket</p> : null}

                  {data.nudge.kind === "progress" ? <DeliveryRibbon className="mt-3" reached={false} pct={data.nudge.pct} remaining={data.nudge.remaining} boutique={data.nudge.boutique} /> : null}
                  {data.nudge.kind === "unlocked" ? <DeliveryRibbon className="mt-3" reached pct={100} /> : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" asChild><Link href="/cart">View basket</Link></Button>
                    {hasProblem ? <Button size="sm" disabled>Checkout</Button> : <Button size="sm" asChild><Link href="/checkout">Checkout</Link></Button>}
                  </div>
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
