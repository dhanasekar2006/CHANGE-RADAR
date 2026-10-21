import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { USE_MOCK } from "@/api/config";
import { useDeals } from "@/api/priceHooks";
import { HeroVisual } from "@/components/HeroVisual";
import { Logo } from "@/components/Logo";
import { useAuthed } from "@/hooks/useAuthed";
import { formatINR } from "@/lib/format";
import type { Deal } from "@/types/prices";

// The landing page is the one light-themed screen; the app behind it stays dark. Wrapping everything
// in `.landing` lets index.css adjust the few global styles (focus ring offset) that assume a dark page.

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Deals", href: "#deals" },
];

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-sky-500";
const btnOutline =
  "inline-flex items-center justify-center rounded-lg border border-sky-600 bg-white px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50";

const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const FEATURES = [
  {
    title: "Compare stores",
    text: "See every store's price, stock and last check side by side, with the cheapest one flagged.",
    icon: icon("M7 7h13M7 12h13M7 17h13M3.5 7h.01M3.5 12h.01M3.5 17h.01"),
  },
  {
    title: "Price history",
    text: "Follow a product's price over 1, 3 or 6 months so you can tell a real deal from a fake discount.",
    icon: icon("M3 3v18h18M7 15l4-4 3 3 5-6"),
  },
  {
    title: "Target alerts",
    text: "Set the price you'll pay. We email you or message you on WhatsApp or Telegram when it's reached.",
    icon: icon(
      "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
    ),
  },
  {
    title: "Live updates",
    text: "Open pages update the moment a price changes. No refreshing, no stale numbers.",
    icon: icon("M13 2 3 14h9l-1 8 10-12h-9l1-8Z"),
  },
];

const FACTS = [
  { value: "30 min", label: "default recheck interval" },
  { value: "Live", label: "price changes pushed to your browser" },
  { value: "Email + WhatsApp", label: "price-drop alerts" },
  { value: "6 months", label: "of price history" },
];

const STEPS = [
  {
    title: "Paste a link or search",
    text: "Drop in a product link from a supported store, or search what's already being tracked.",
  },
  {
    title: "We watch the price",
    text: "Every listing is rechecked on a schedule, and each change is saved to its history.",
  },
  {
    title: "Get told when it drops",
    text: "Set a target price and hear about it the moment a store hits it.",
  },
];

function SectionHeading({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
      >
        {title}
      </h2>
      {children && <p className="mt-3 text-slate-600">{children}</p>}
    </div>
  );
}

function SiteHeader() {
  const authed = useAuthed();
  const [open, setOpen] = useState(false);

  const linkClass =
    "rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-sky-700";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" aria-label="VilaiWatch home" className="text-slate-900">
          <Logo name="VilaiWatch" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!USE_MOCK && !authed && (
            <Link to="/login?next=/prices" className={linkClass}>
              Sign in
            </Link>
          )}
          <Link
            to={authed || USE_MOCK ? "/prices" : "/prices/search"}
            className={`${btnPrimary} !py-2`}
          >
            {authed || USE_MOCK ? "Open dashboard" : "Start tracking"}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label="Menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-900 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block ${linkClass}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {!USE_MOCK && !authed && (
              <li>
                <Link to="/login?next=/prices" className={`block ${linkClass}`}>
                  Sign in
                </Link>
              </li>
            )}
            <li className="pt-2">
              <Link
                to={authed || USE_MOCK ? "/prices" : "/prices/search"}
                className={`${btnPrimary} w-full`}
              >
                {authed || USE_MOCK ? "Open dashboard" : "Start tracking"}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Know the best price before it changes.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            Compare stores, watch price history, and get alerted the moment a
            price drops. Paste a link and we do the watching.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/prices/search" className={btnPrimary}>
              Start tracking
            </Link>
            <a href="#deals" className={btnOutline}>
              See today&apos;s drops
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm text-slate-700">
            {[
              "Prices in ₹",
              "Rechecked every 30 min",
              "Email & WhatsApp alerts",
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-slate-100 px-3.5 py-1.5 font-medium"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function Facts() {
  return (
    <section
      aria-label="At a glance"
      className="border-y border-slate-200 bg-slate-50"
    >
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 lg:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label} className="px-2 text-center">
            <dt className="sr-only">{fact.label}</dt>
            <dd className="text-xl font-bold text-slate-900 sm:text-2xl">
              {fact.value}
            </dd>
            <dd className="mt-1 text-sm text-slate-600" aria-hidden>
              {fact.label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-20 px-4 py-16 lg:py-24"
    >
      <SectionHeading
        id="features-title"
        title="Everything you need to buy at the right price"
      >
        One place to follow a product across stores, from first check to the day
        it drops.
      </SectionHeading>
      <ul className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              {feature.icon}
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {feature.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-20 bg-slate-50 px-4 py-16 lg:py-24"
    >
      <SectionHeading id="how-title" title="How it works" />
      <ol className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative text-center">
            <span
              aria-hidden
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-lg font-bold text-white shadow-glow"
            >
              {i + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      to={`/prices/p/${deal.product_id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      {deal.image_url ? (
        <img
          src={deal.image_url}
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="aspect-[16/9] w-full bg-slate-100 object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-sky-100 to-slate-100 text-5xl font-bold text-sky-600"
        >
          {deal.name.charAt(0)}
        </div>
      )}
      <div className="p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 group-hover:text-sky-700">
          {deal.name}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          at <span className="capitalize">{deal.store}</span>
        </p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xl font-bold text-emerald-700">
            {formatINR(deal.price)}
          </span>
          <span className="text-sm text-slate-600 line-through">
            {formatINR(deal.avg_30d)}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            −{deal.drop_pct.toFixed(1)}%
          </span>
        </p>
      </div>
    </Link>
  );
}

function Deals() {
  const deals = useDeals();
  const items = deals.data?.slice(0, 6) ?? [];

  return (
    <section
      id="deals"
      aria-labelledby="deals-title"
      className="scroll-mt-20 px-4 py-16 lg:py-24"
    >
      <SectionHeading id="deals-title" title="Biggest price drops">
        Cheapest in-stock price compared with its 30-day average.
      </SectionHeading>
      <div className="mx-auto mt-12 max-w-6xl">
        {deals.isPending ? (
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((deal) => (
              <DealCard key={deal.product_id} deal={deal} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600">
            {deals.isError
              ? "Deals couldn't be loaded right now."
              : "No price drops right now. They appear here when a price falls below its recent average."}
          </p>
        )}
        <div className="mt-8 text-center">
          <Link to="/prices" className={btnOutline}>
            Browse all prices
          </Link>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="px-4 pb-16 lg:pb-24">
      <div className="mx-auto max-w-6xl rounded-3xl bg-sky-600 px-6 py-14 text-center text-white shadow-glow sm:px-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop overpaying.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sky-100">
          Track your first product in under a minute. Set a target and
          we&apos;ll tell you when it&apos;s time to buy.
        </p>
        <Link
          to="/prices/search"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
        >
          Start tracking
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row">
        <span className="text-slate-900">
          <Logo name="VilaiWatch" />
        </span>
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-5 gap-y-2"
        >
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-sky-700">
              {item.label}
            </a>
          ))}
          <Link to="/prices" className="hover:text-sky-700">
            Dashboard
          </Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} VilaiWatch</p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="landing min-h-full bg-white text-slate-900">
      <SiteHeader />
      <main>
        <Hero />
        <Facts />
        <Features />
        <HowItWorks />
        <Deals />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}
