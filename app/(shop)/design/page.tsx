import { ArrowRight, Bird, Gift, Heart, Star } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Jaali } from "@/components/ornaments/Jaali";
import { OrnamentDivider } from "@/components/ornaments/Divider";
import { ThemePreviewSwitcher } from "@/components/theme/ThemePreviewSwitcher";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

export const metadata = { title: "Design system — GiftPing", robots: { index: false, follow: false } };

const SWATCHES = [
  { name: "Canvas", token: "brand-light", className: "bg-brand-light", use: "Page background" },
  { name: "Surface", token: "brand-surface", className: "bg-brand-surface", use: "Cards, panels, inputs" },
  { name: "Peach", token: "brand-accent", className: "bg-brand-accent", use: "Soft panels, chips" },
  { name: "Forest", token: "brand-primary", className: "bg-brand-primary", use: "Bars, buttons, footer" },
  { name: "Forest deep", token: "brand-primary-dark", className: "bg-brand-primary-dark", use: "Hover, depth" },
  { name: "Copper", token: "brand-secondary", className: "bg-brand-secondary", use: "Accent, links, badges" },
  { name: "Copper deep", token: "brand-secondary-dark", className: "bg-brand-secondary-dark", use: "Accent text, hover" },
  { name: "Ink", token: "brand-dark", className: "bg-brand-dark", use: "Text" },
];

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-secondary-dark">Design system</p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl leading-tight text-brand-dark sm:text-6xl">
          A World of Gifts. <br /> A World of <span className="accent-word">Emotions.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-brand-dark/70">
          The look and feel every page is built from. Nothing here is a mock-up — it is the real header, footer and components. Switch theme below to see the entire page restyle itself:
          that is how a Diwali or Christmas makeover will work — variables change, no page does.
        </p>
        <div className="mt-6"><ThemePreviewSwitcher /></div>
      </header>

      <section aria-labelledby="colour">
        <h2 id="colour" className="font-heading text-3xl text-brand-dark">Colour</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SWATCHES.map((s) => (
            <Reveal key={s.token}>
              <div className={`h-24 rounded-card border border-brand-dark/10 shadow-card ${s.className}`} />
              <p className="mt-2 text-sm font-medium text-brand-dark">{s.name}</p>
              <p className="text-xs text-brand-dark/55">{s.use}</p>
              <p className="font-mono text-[11px] text-brand-dark/40">{s.token}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="type">
        <h2 id="type" className="font-heading text-3xl text-brand-dark">Typography</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-dark/50">Display serif — Newsreader</p>
            <p className="font-heading text-5xl text-brand-dark">Discover Meaningful Gifting</p>
            <p className="font-heading text-2xl text-brand-dark">Handpicked Just For You</p>
            <p className="font-heading text-xl italic text-brand-secondary-dark">Comes Alive — the italic carries emotion</p>
          </Card>
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-dark/50">Body — DM Sans</p>
            <p className="text-base text-brand-dark">Explore handpicked collections, premium boutiques and unforgettable experiences crafted for every relationship and every occasion.</p>
            <p className="text-sm text-brand-dark/70">Secondary text sits at 70% ink; captions at 55%. Small caps labels are tracked wide.</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-brand-secondary-dark">Curated with love</p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="buttons">
        <h2 id="buttons" className="font-heading text-3xl text-brand-dark">Buttons &amp; fields</h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button>Explore the Mall <ArrowRight className="h-4 w-4" /></Button>
          <Button variant="secondary">Continue Shopping</Button>
          <Button variant="outline">Watch Our Story</Button>
          <Button variant="gold">Open My Diary</Button>
          <Button variant="ghost">Skip</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
          <div><Label htmlFor="ds-name">Recipient&apos;s name</Label><Input id="ds-name" placeholder="Enter name" /></div>
          <div className="flex items-end gap-2"><Badge variant="gold">Bestseller</Badge><Badge variant="primary">Featured boutique</Badge><Badge>In review</Badge></div>
        </div>
      </section>

      <section aria-labelledby="cards">
        <h2 id="cards" className="font-heading text-3xl text-brand-dark">Cards</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Gift, title: "Premium Collections", text: "Handpicked gifts that speak elegance and thoughtfulness." },
            { icon: Heart, title: "Personal Gifting Diary", text: "Remember every special day. We'll remind you with love." },
            { icon: Star, title: "Gifting Services", text: "Gift wrapping, messages, and delightful surprises." },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <Card className="group h-full transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-brand-on-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-heading text-xl text-brand-dark">{title}</h3>
                <p className="mt-1 text-sm text-brand-dark/65">{text}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary-dark">Explore Now <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" /></p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="ornament">
        <h2 id="ornament" className="font-heading text-3xl text-brand-dark">Ornaments &amp; motion</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Card className="relative overflow-hidden bg-brand-primary text-brand-on-primary">
            <Jaali className="opacity-[0.12]" />
            <div className="relative py-6 text-center">
              <Bird className="float-slow mx-auto h-8 w-8 text-brand-secondary" aria-hidden="true" />
              <p className="mt-3 font-heading text-2xl italic">Gifting, from the heart.</p>
              <OrnamentDivider className="mt-4" />
            </div>
          </Card>
          <Card className="flex flex-col justify-center gap-2">
            <p className="font-heading text-xl text-brand-dark">Slow, warm, purposeful.</p>
            <p className="text-sm text-brand-dark/70">Things arrive (fade-up on scroll), breathe (the robin floats), and respond (cards lift, arrows nudge). Nothing bounces; everything stops for visitors who prefer reduced motion. Ornaments are drawn in code, so they recolour with the theme.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
