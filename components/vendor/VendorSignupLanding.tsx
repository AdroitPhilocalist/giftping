import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Landmark, Package, Store, Truck, Wallet } from "lucide-react";
import { Ambience } from "@/components/shop/Ambience";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { SiteImage } from "@/lib/content/imagery";

/**
 * What a signed-out visitor sees at /vendor/register.
 *
 * It used to be a centred heading and two buttons — a dead end that told a prospective vendor nothing about what they were
 * signing up for. This is the storefront pitch instead: what the mall is, what a boutique actually gets (all four claims are
 * real features of the vendor portal — storefront, product tools with CSV import, the orders/returns queue, auditable
 * payouts), how the approval actually works, and the money in plain words.
 *
 * The hero mirrors /vendors' own established treatment — the Boutique Avenue photograph with its light drifting over it, the
 * headline on the cream canvas to its left — so the page reads as the same place the vendor is about to move into. Same
 * components, same idiom, no new CSS.
 */
export function VendorSignupLanding({
  art,
  holdDays,
}: {
  /** The Boutique Avenue photograph, via the same `siteImage()` lookup /vendors uses — null only if the artwork is missing. */
  art: SiteImage | null;
  /** Live from platform_settings — the payout hold, so the page can't drift from what the payout functions actually do. */
  holdDays: number;
}) {
  return (
    <div>
      {/* ── the doorway ─────────────────────────────────────────────────────────────────────────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="rise">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Sell on GiftPing</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl">
            Open your boutique in <span className="accent-word">the mall</span>.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-brand-dark/70">
            GiftPing is a gifting mall, not a product grid. Every partner gets a real storefront — its own shopfront, banner, logo and brand story —
            and one place to run the products, orders, returns and payouts behind it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Create an account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/sign-in?redirectTo=/vendor/register">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-brand-dark/55">
            Applying takes about five minutes. Our team reads every application before a boutique goes live — and you can shop with the same
            account while you wait.
          </p>
        </div>

        <div className="relative isolate overflow-hidden rounded-card shadow-lift">
          {art ? (
            <Image src={art.src} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          ) : (
            <div className="h-full min-h-[16rem] bg-gradient-to-b from-brand-primary-dark to-brand-primary" aria-hidden="true" />
          )}
          <Ambience kind="sparks" count={10} />
          <div className="relative flex min-h-[16rem] flex-col justify-end bg-gradient-to-t from-brand-primary-dark/85 via-brand-primary-dark/25 to-transparent p-6 sm:min-h-[22rem] sm:p-8 lg:min-h-[26rem]">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/80">Boutique Avenue</p> {/* theme-safe: text on a photo scrim */}
            <p className="mt-2 max-w-xs font-heading text-2xl leading-snug text-white">Every shopfront here is a brand of its own.</p> {/* theme-safe: text on a photo scrim */}
          </div>
        </div>
      </section>

      {/* ── how it works ────────────────────────────────────────────────────────────────────────────────────────────── */}
      <Reveal as="section" className="mt-16 border-t border-brand-dark/[0.07] pt-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">How it works</p>
        <h2 className="mt-2 font-heading text-3xl text-brand-dark">Three steps to your shopfront.</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
          {[
            {
              title: "Apply in five minutes",
              text: "Your business, your tax details and where couriers should collect from. It's all on this page, and you can change any of it until you submit.",
            },
            {
              title: "We review it",
              text: "A human on our team reads every application — usually within a day or two. You'll see the decision here and in your notifications.",
            },
            {
              title: "Open your doors",
              text: "Once you're approved, add products from your dashboard — a few at a time, or your whole catalogue by CSV — and your boutique appears in the mall.",
            },
          ].map((step, i) => (
            <li key={step.title} className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary font-heading text-lg text-brand-on-primary shadow-card">
                {i + 1}
              </span>
              <p className="mt-4 font-heading text-xl text-brand-dark">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-dark/65">{step.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ── what a boutique actually gets ───────────────────────────────────────────────────────────────────────────── */}
      <Reveal as="section" className="mt-16 border-t border-brand-dark/[0.07] pt-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">What you get</p>
        <h2 className="mt-2 font-heading text-3xl text-brand-dark">A storefront, and the till behind it.</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:gap-4">
          {[
            {
              icon: Store,
              title: "A real storefront",
              text: "Your own shopfront on Boutique Avenue — banner, logo and brand story — with every product presented as a gift, not a grid thumbnail.",
            },
            {
              icon: Package,
              title: "Product tools that match your catalogue",
              text: "Sizes, weights, flavours, metals, colours — variants and category-specific attributes, added one at a time or in bulk from a CSV.",
            },
            {
              icon: Truck,
              title: "Orders, returns and couriers in one queue",
              text: "Every order, return and refund lands in your dashboard, and courier pickup is booked from the address you give us here.",
            },
            {
              icon: Wallet,
              title: "Payouts you can audit",
              text: "See what's payable now and what's still in hold, and download a statement for every settlement that's been made to you.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card">
              <Icon className="h-6 w-6 text-brand-secondary" strokeWidth={1.6} aria-hidden="true" />
              <p className="mt-3 font-heading text-lg text-brand-dark">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/65">{text}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── the money ───────────────────────────────────────────────────────────────────────────────────────────────── */}
      <Reveal as="section" className="mt-16 border-t border-brand-dark/[0.07] pt-12">
        <div className="rounded-card border border-brand-dark/[0.07] bg-brand-accent/40 p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand-secondary-dark" strokeWidth={1.7} aria-hidden="true" />
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">The money, plainly</p>
          </div>
          <h2 className="mt-2 font-heading text-3xl text-brand-dark">How you get paid.</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-widest text-brand-dark/45">Commission</dt>
              <dd className="mt-1 font-heading text-3xl text-brand-dark">Per order</dd>
              <p className="mt-1 text-sm leading-relaxed text-brand-dark/60">
                taken out of your payout for that order — you are never invoiced for it up front.
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-brand-dark/45">Earnings clear</dt>
              <dd className="mt-1 font-heading text-3xl text-brand-dark">{holdDays} days</dd>
              <p className="mt-1 text-sm leading-relaxed text-brand-dark/60">after delivery, which covers the returns window before a payout is due.</p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-brand-dark/45">If an order is refunded</dt>
              <dd className="mt-1 font-heading text-3xl text-brand-dark">In proportion</dd>
              <p className="mt-1 text-sm leading-relaxed text-brand-dark/60">that item&apos;s earnings shrink with it — refunds never touch the rest of your payout.</p>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-brand-dark/50">
            Your commission rate is set for your boutique by GiftPing and applied when we settle your orders — ask us any time. The rest is in the{" "}
            <Link href="/vendor/terms" className="font-medium text-brand-secondary-dark underline underline-offset-2 hover:text-brand-secondary">
              vendor terms
            </Link>
            , the same ones your application asks you to accept.
          </p>
        </div>
      </Reveal>

      {/* ── the ask, once more ──────────────────────────────────────────────────────────────────────────────────────── */}
      <Reveal as="section" className="mt-16 border-t border-brand-dark/[0.07] pt-12">
        <div className="flex flex-col items-start gap-6 rounded-card border border-brand-dark/[0.07] bg-brand-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="font-heading text-2xl text-brand-dark sm:text-3xl">Ready to open your boutique?</p>
            <p className="mt-1.5 flex items-start gap-2 text-sm text-brand-dark/60">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary" strokeWidth={1.7} aria-hidden="true" />
              Create an account, apply, and keep shopping as a customer meanwhile.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Create an account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/sign-in?redirectTo=/vendor/register">Sign in</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
