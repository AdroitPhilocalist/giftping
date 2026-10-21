import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Compass,
  Handshake,
  PartyPopper,
  PenTool,
  ReceiptText,
  Truck,
  UserPlus,
} from "lucide-react";
import { CorporateEnquiryForm } from "@/components/corporate/CorporateEnquiryForm";
import { SectionHeading } from "@/components/home/SectionHeading";
import { SpotlightSection } from "@/components/motion/SpotlightSection";
import { Jaali } from "@/components/ornaments/Jaali";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { getServerUser } from "@/lib/auth/session";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { listProducts } from "@/lib/db/products";
import { pageMetadata } from "@/lib/seo/site-seo";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("corporate-gifting");

const USE_CASES = [
  {
    icon: Handshake,
    title: "Client & partner gifting",
    text: "Thank-you gifts that keep the relationship warm, from a small leadership team to a full client list.",
  },
  {
    icon: Award,
    title: "Employee recognition",
    text: "Milestones, awards and everyday appreciation, chosen to feel personal rather than procedural.",
  },
  {
    icon: UserPlus,
    title: "Welcome & onboarding",
    text: "First-day kits that make a new colleague feel expected, set up and part of the team from the start.",
  },
  {
    icon: PartyPopper,
    title: "Festive & event gifting",
    text: "Diwali hampers, conference kits and branded keepsakes that carry your name beyond the room.",
  },
];

const DETAILS = [
  {
    icon: Compass,
    title: "Curated around the brief",
    text: "We shortlist from our own Originals and independent boutiques around your people, budget and message — not a single take-it-or-leave-it box.",
  },
  {
    icon: PenTool,
    title: "Branding that belongs",
    text: "Logo printing, engraving, embroidery, laser etching and custom packaging, chosen where the product and your brand actually suit it.",
  },
  {
    icon: ReceiptText,
    title: "A clear, consolidated quote",
    text: "One quote with the gift, personalisation, packaging and delivery costs set out, plus GST invoicing for your finance team.",
  },
  {
    icon: Truck,
    title: "Delivery planned with you",
    text: "A single office delivery or individual recipient addresses — we agree the plan before we pack, and keep you updated until it lands.",
  },
];

const STEPS = [
  {
    title: "Share the brief",
    text: "Tell us who the gifts are for, how many, your budget per gift, and any branding or delivery requirements.",
  },
  {
    title: "We curate & quote",
    text: "Our gifting team puts together a shortlist, with samples where useful, and a clear per-gift quote.",
  },
  {
    title: "You approve the details",
    text: "Choose the gifts, confirm branding and packaging, and sign off on the delivery plan.",
  },
  {
    title: "We pack & deliver",
    text: "We coordinate production, packing and dispatch, and stay with you until the last box arrives.",
  },
];

const FAQS = [
  {
    question: "Is there a minimum order?",
    answer:
      "There isn't a one-size-fits-all minimum. Bulk pricing and branding depend on the gift and the quantity, so share your brief and we'll be clear about what's possible at your scale.",
  },
  {
    question: "Can you put our logo on the gifts?",
    answer:
      "Yes, where the product allows it. Depending on the gift, that can include printing, engraving, embroidery, laser etching and custom packaging. We'll recommend the method that looks best and suits your timeline.",
  },
  {
    question: "Can you deliver to individual employees?",
    answer:
      "Yes. We can plan a consolidated delivery to your office or individual deliveries to recipients. Share the destinations in the brief and we'll confirm the best approach and costs.",
  },
  {
    question: "Do you provide GST invoices?",
    answer:
      "Yes. Corporate orders are invoiced with your GST details. Share your GSTIN in the brief or when we reply, and we'll take it from there.",
  },
  {
    question: "How far in advance should we start?",
    answer:
      "For a simple order, a few weeks is usually comfortable. Branded, personalised or large rollouts need more time. We'll confirm the timeline in your quote before you commit.",
  },
  {
    question: "Can you work within our budget?",
    answer:
      "That's the starting point, not an afterthought. Tell us your per-gift budget and we'll curate within it, with options that still feel considered.",
  },
];

const BRANDING_OPTIONS = ["Logo printing", "Engraving", "Embroidery", "Laser etching", "Custom packaging", "Personal notes"];

export default async function CorporateGiftingPage() {
  const [theme, user] = await Promise.all([getActiveTheme(), getServerUser()]);
  const [{ products }, wishlistIds] = await Promise.all([
    listProducts({ categorySlug: "corporate-gifting", page: 1, pageSize: 4, sort: "popularity" }),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const hero = siteImage("type-corporate-branded-gifts", theme.id);
  const minDeliveryDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-brand-light">
      <section className="relative isolate overflow-hidden bg-brand-primary text-brand-on-primary">
        <Jaali className="opacity-[0.08]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-brand-secondary">For teams, clients & milestones</p>
            <h1 className="mt-4 max-w-2xl text-balance font-heading text-4xl leading-[1.06] sm:text-5xl lg:text-6xl">
              Your name on every gift.
              <br />
              <span className="text-brand-secondary italic">Our care in every detail.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-on-primary/75 sm:text-lg">
              From client thank-yous to company-wide celebrations, GiftPing curates, personalises and delivers gifts that carry your business with thought.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="gold" asChild>
                <Link href="#enquiry">Request a proposal <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-brand-on-primary/30 text-brand-on-primary hover:bg-brand-on-primary/10 hover:text-brand-on-primary" asChild>
                <Link href="/categories/corporate-gifting">Browse corporate gifts</Link>
              </Button>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-brand-on-primary/75 sm:flex sm:flex-wrap sm:gap-x-6">
              {["Bulk quantities", "Branding on request", "GST invoices", "Delivery across India"].map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-secondary" strokeWidth={2.2} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-brand-on-primary/15 shadow-lift">
              {hero ? (
                <Image
                  src={hero.src}
                  alt="A corporate gift set with a leather notebook, pen and branded packaging"
                  fill
                  priority
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-brand-primary-dark">
                  <BriefcaseBusiness className="h-16 w-16 text-brand-secondary/70" strokeWidth={1.2} aria-hidden="true" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/80 via-brand-primary-dark/5 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-brand-on-primary/15 bg-brand-primary/85 p-4 backdrop-blur-sm sm:inset-x-5 sm:bottom-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand-secondary">A considered starting point</p>
                <p className="mt-1 font-heading text-lg leading-snug text-brand-on-primary">
                  Executive hampers, desk essentials and welcome kits — ready to make your own.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Corporate gifting sections" className="border-b border-brand-dark/[0.06] bg-brand-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-3 text-xs font-medium text-brand-dark/60 sm:px-6 lg:px-8">
          <a href="#what-we-handle" className="whitespace-nowrap transition-colors hover:text-brand-secondary-dark">What we handle</a>
          <a href="#details" className="whitespace-nowrap transition-colors hover:text-brand-secondary-dark">The details</a>
          <a href="#how-it-works" className="whitespace-nowrap transition-colors hover:text-brand-secondary-dark">How it works</a>
          <a href="#gifts" className="whitespace-nowrap transition-colors hover:text-brand-secondary-dark">Corporate gifts</a>
          <a href="#faqs" className="whitespace-nowrap transition-colors hover:text-brand-secondary-dark">FAQs</a>
          <a href="#enquiry" className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-brand-secondary-dark hover:text-brand-secondary">
            Request a proposal <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </nav>

      <section id="what-we-handle" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="What we handle"
          title={<>Gifting that fits <span className="accent-word">the way you work.</span></>}
          subtitle="A corporate gift has to do a job — say thank you, welcome someone, mark a milestone, or keep a relationship close. We start with the moment, then find the gift."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="group rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark transition-colors duration-300 group-hover:bg-brand-secondary group-hover:text-brand-on-secondary">
                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-heading text-xl leading-snug text-brand-dark">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-dark/65">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-card border border-brand-dark/[0.07] bg-brand-accent/45 p-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-secondary-dark">Also part of the brief</p>
            <p className="mt-1 text-sm text-brand-dark/65">Conference kits, branded merchandise, festive hampers, milestone awards — and the list you haven&apos;t written down yet.</p>
          </div>
          <Link href="#enquiry" className="mt-3 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-secondary-dark hover:text-brand-secondary sm:mt-0">
            Tell us what you need <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="details" className="scroll-mt-24 bg-brand-accent/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">The details, handled</p>
            <h2 className="mt-2 font-heading text-3xl leading-tight text-brand-dark sm:text-4xl">
              One brief. One team. <span className="accent-word">Every detail.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-brand-dark/65 sm:text-base">
              Corporate gifting gets complicated when twenty small decisions land on your desk. We take the production, personalisation, packing and delivery off it — and keep you in the loop at the moments that matter.
            </p>
            <Link href="#enquiry" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary-dark hover:text-brand-secondary">
              Start with a brief <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="mt-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand-dark/45">Branding options</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {BRANDING_OPTIONS.map((option) => <li key={option} className="rounded-full border border-brand-dark/10 bg-brand-surface px-3 py-1.5 text-xs text-brand-dark/70">{option}</li>)}
              </ul>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DETAILS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card">
                <Icon className="h-5 w-5 text-brand-secondary-dark" strokeWidth={1.6} aria-hidden="true" />
                <h3 className="mt-3 font-heading text-lg leading-snug text-brand-dark">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/60">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="How it works"
          title={<>From first brief to <span className="accent-word">the last doorstep.</span></>}
          subtitle="A clear, four-step process — with a real person on the other end of it."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-primary font-heading text-lg text-brand-on-primary">{index + 1}</span>
              <h2 className="mt-4 font-heading text-xl leading-snug text-brand-dark">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-dark/65">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-xs leading-relaxed text-brand-dark/45">
          Lead times depend on branding and quantity. We&apos;ll confirm dates in your quote before you commit.
        </p>
      </section>

      <section id="gifts" className="scroll-mt-24 border-y border-brand-dark/[0.06] bg-brand-accent/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading
              align="left"
              eyebrow="A starting point"
              title={<>Corporate-ready gifts, <span className="accent-word">already considered.</span></>}
              subtitle="A short edit from our corporate collection. Every gift can be tailored to your brief, budget and branding."
            />
            <Button variant="outline" asChild>
              <Link href="/categories/corporate-gifting">Explore the collection <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </div>
          {products.length > 0 ? (
            <SpotlightSection className="mt-8">
              <ProductGrid>
                {products.map((product) => <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />)}
              </ProductGrid>
            </SpotlightSection>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 bg-brand-surface p-10 text-center text-sm text-brand-dark/55">
              Our corporate collection is being refreshed. Tell us the brief and we&apos;ll curate something for you.
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-dark/55">Need something outside the collection? We can source from our boutiques and Originals.</p>
            <Link href="#enquiry" className="inline-flex items-center gap-1 text-sm font-medium text-brand-secondary-dark hover:text-brand-secondary">
              Ask for a curated shortlist <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="enquiry" className="scroll-mt-24 relative isolate overflow-hidden bg-brand-primary text-brand-on-primary">
        <Jaali className="opacity-[0.07]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-14">
            <div className="lg:sticky lg:top-28">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary">Let&apos;s make it yours</p>
              <h2 className="mt-3 text-balance font-heading text-3xl leading-tight sm:text-4xl">
                A better brief makes <span className="text-brand-secondary italic">a better gift.</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-on-primary/70 sm:text-base">
                Tell us about the people, the budget and the moment. We&apos;ll come back with a shortlist and a quote that makes the next decision easy.
              </p>
              <ol className="mt-8 hidden space-y-5 lg:block">
                {[
                  "We read your brief and ask only the questions that matter.",
                  "We send a curated shortlist, with samples where useful.",
                  "You approve the gifts, branding and delivery plan.",
                  "We produce, pack and dispatch — keeping you updated.",
                ].map((point, index) => (
                  <li key={point} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand-secondary/40 text-xs text-brand-secondary">{index + 1}</span>
                    <span className="text-sm leading-relaxed text-brand-on-primary/70">{point}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 hidden rounded-2xl border border-brand-on-primary/15 bg-brand-on-primary/[0.04] p-4 lg:block">
                <p className="font-heading text-lg text-brand-on-primary">Prefer to talk it through?</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-on-primary/60">
                  Share your number in the brief and we&apos;ll arrange a call. For anything else, our contact page is the quickest route.
                </p>
                <Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary hover:text-brand-on-primary">
                  Contact GiftPing <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div>
              <CorporateEnquiryForm minDeliveryDate={minDeliveryDate} />
              <p className="mt-4 text-center text-xs text-brand-on-primary/60 lg:hidden">
                Prefer to talk it through? <Link href="/contact" className="font-medium text-brand-secondary underline underline-offset-2">Contact GiftPing</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faqs" className="scroll-mt-24 mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="Good to know"
          title={<>Questions we hear <span className="accent-word">before the first quote.</span></>}
          subtitle="If yours isn't here, put it in the brief — we'd rather answer it properly."
        />
        <div className="mt-8 divide-y divide-brand-dark/[0.08] rounded-card border border-brand-dark/[0.08] bg-brand-surface px-5 shadow-card sm:px-7">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg text-brand-dark marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-brand-secondary-dark transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-dark/65">{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="#enquiry">Request a proposal <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/categories/corporate-gifting">Browse corporate gifts</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
