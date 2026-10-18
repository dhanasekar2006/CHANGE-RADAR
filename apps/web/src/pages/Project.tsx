import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { LogoMark } from "@/components/Logo";

// Project overview page. All copy comes from README.md, docs/ and the packages/core layout;
// nothing here is invented marketing. Light themed like the other public pages.

const NAV = [
  { label: "Home", to: "/" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#pipeline" },
  { label: "Architecture", href: "#architecture" },
  { label: "Quickstart", href: "#quickstart" },
];

const svgProps = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg {...svgProps} className={className}>
      <path d={d} />
    </svg>
  );
}

const ARROW = "M5 12h14m-6-6 6 6-6 6";
const ARROW_UP_RIGHT = "M7 17 17 7M8 7h9v9";

const btnPrimary =
  "inline-flex items-center justify-center gap-3 rounded-full bg-site-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-site-navy";

const FEATURES = [
  {
    title: "Fetch anything",
    text: "Plain HTTP pages, RSS and Atom feeds, and JavaScript-heavy pages through a headless browser.",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21m0-18C9.5 5.5 8.5 8.5 8.5 12s1 6.5 3.5 9M3 12h18",
  },
  {
    title: "Extract what matters",
    text: "Narrow a page down with CSS selectors, XPath, JSONPath, or readable article text.",
    icon: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 12h8",
  },
  {
    title: "Diff every snapshot",
    text: "Each new snapshot is compared with the last using text, JSON, or visual diffs.",
    icon: "M7 4v16M17 4v16M7 8h10M7 16h10",
  },
  {
    title: "Score the significance",
    text: "Changes are rated from noise to critical. An AI model can refine the score and summarise the diff, and never blocks delivery.",
    icon: "M3 17l6-6 4 4 8-8M15 7h6v6",
  },
  {
    title: "Notify your way",
    text: "Email, Slack, Discord, Telegram, or webhooks. One channel failing never blocks the others.",
    icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  },
  {
    title: "Track prices with VilaiWatch",
    text: "Compare stores, follow price history, see the biggest drops, and set a target price. Open pages update live.",
    icon: "M3 3v18h18M7 15l4-4 3 3 5-6",
  },
];

const STEPS = [
  { name: "Fetch", text: "Download the page, feed, or API response." },
  { name: "Extract", text: "Keep only the part you care about." },
  { name: "Normalize", text: "Strip whitespace and ignored noise so only real changes remain." },
  { name: "Diff", text: "Compare against the previous snapshot." },
  { name: "Score", text: "Rate significance, from noise to critical." },
  { name: "Notify", text: "Send it to every channel on the monitor." },
];

const PARTS = [
  { path: "apps/api", tech: "FastAPI", text: "HTTP service. Owns auth, CRUD for monitors, channels and workspaces, and the change feed. No detection logic lives here." },
  { path: "apps/worker", tech: "Celery", text: "Workers plus a beat scheduler. Run monitor checks, diffing, AI scoring and notification fan-out on a schedule." },
  { path: "apps/web", tech: "React · Vite", text: "The dashboard, including the VilaiWatch price-tracking UI at /prices." },
  { path: "packages/core", tech: "Python", text: "The shared detection engine: fetchers, extractors, normalizers, differs, scoring, models, storage and notifiers." },
  { path: "packages/shared", tech: "Python", text: "Cross-cutting helpers (logging, error taxonomy, constants) used by every service." },
  { path: "migrations", tech: "Alembic", text: "Revisions for the shared Postgres schema." },
  { path: "infra", tech: "Docker", text: "Docker, Caddy, nginx, Kubernetes and monitoring config." },
];

const LINKS = [
  { label: "API", value: "http://localhost:8000", note: "docs at /docs" },
  { label: "Web", value: "http://localhost:5173" },
  { label: "Postgres", value: "localhost:5432" },
  { label: "Redis", value: "localhost:6379" },
  { label: "MinIO console", value: "http://localhost:9001" },
];

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm ${light ? "border-white/40 text-white" : "border-slate-300 text-slate-700"}`}
    >
      <span aria-hidden className="h-0.5 w-4 bg-site-orange" />
      {children}
    </span>
  );
}

function SectionHead({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-4 font-heading text-4xl font-bold leading-tight text-site-navy sm:text-5xl">
        {title}
      </h2>
      {children && <p className="mt-3 text-slate-600">{children}</p>}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const linkClass = "block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-site-deep";

  return (
    <header className="sticky top-0 z-30 px-4 pt-3">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white px-5 py-3 shadow-xl ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="ChangeRadar home" className="flex items-center gap-2.5 text-site-navy">
            <LogoMark fillClass="fill-site-deep" />
            <span className="font-heading text-2xl font-bold uppercase tracking-wide">
              Change<span className="text-site-deep">Radar</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} className={linkClass}>
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/prices" className={`${btnPrimary} hidden !gap-2 !px-5 !py-2 sm:inline-flex`}>
              Open dashboard
              <Icon d={ARROW} className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="overview-menu"
              aria-label="Menu"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-site-navy lg:hidden"
            >
              <Icon d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {open && (
          <nav id="overview-menu" aria-label="Mobile" className="mt-3 border-t border-slate-200 pt-3 lg:hidden">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.label}>
                  {item.to ? (
                    <Link to={item.to} className={linkClass}>
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} onClick={() => setOpen(false)} className={linkClass}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
              <li className="pt-2 sm:hidden">
                <Link to="/prices" className={`${btnPrimary} w-full`}>
                  Open dashboard
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

// Decorative: a change being detected, scored and sent. Values are illustrative.
function HeroVisual() {
  // Shown only where there is room outside the card, so they never cover its text.
  const chip = "absolute hidden rounded-full bg-site-navy px-3 py-1 text-xs font-medium text-white shadow-lg xl:block";
  return (
    <figure className="relative mx-auto w-full max-w-md pb-6">
      <div aria-hidden className="relative">
        <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-site-orange/25 to-site-navy/10 blur-2xl" />
        <div className="relative rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-xl font-bold text-site-navy">Change detected</p>
              <p className="text-xs text-slate-600">Product page · checked just now</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-site-deep">Major</span>
          </div>
          <div className="mt-4 space-y-1.5 font-mono text-sm">
            <div className="rounded-lg bg-red-50 px-3 py-1.5 text-red-800">− Price: ₹26,990</div>
            <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800">+ Price: ₹24,990</div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-600">Significance</p>
            <div className="mt-1.5 flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${i < 4 ? "bg-site-orange" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
            <span className="font-medium">Sent to</span>
            {["Email", "Slack", "Telegram"].map((c) => (
              <span key={c} className="rounded-md bg-slate-100 px-2 py-1">
                {c}
              </span>
            ))}
          </div>
        </div>
        <span className={`${chip} -left-[4.5rem] top-8`}>✓ Fetched</span>
        <span className={`${chip} -right-[4.5rem] top-24`}>✓ Diffed</span>
        <span className={`${chip} -left-[4.5rem] bottom-24`}>✓ Scored</span>
        <span className={`${chip} -right-[5rem] bottom-8`}>✓ Notified</span>
      </div>
      <figcaption className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5">
        Illustrative preview
      </figcaption>
    </figure>
  );
}

function Hero() {
  return (
    <section className="px-4">
      <div className="mx-auto grid max-w-6xl items-center gap-14 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <Eyebrow>Welcome to ChangeRadar</Eyebrow>
          <h1 className="mt-6 font-heading text-5xl font-bold leading-[1.1] text-site-navy sm:text-6xl">
            Watch every change.
            <br />
            Catch every price drop.
          </h1>
          <p className="mt-6 max-w-xl text-slate-600">
            ChangeRadar watches web pages, feeds, and APIs for changes, diffs each new snapshot against the last, scores
            how significant the change is, and notifies you on the channels you care about.
          </p>
          <p className="mt-3 max-w-xl text-slate-600">
            It also powers <strong className="font-semibold text-site-navy">VilaiWatch</strong>: live price tracking across
            stores, with history, deals, and target-price alerts.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link to="/prices" className={btnPrimary}>
              Open dashboard
              <Icon d={ARROW} className="h-4 w-4" />
            </Link>
            <a href="#pipeline" className="inline-flex items-center gap-3 font-medium text-site-navy transition hover:text-site-deep">
              <svg {...svgProps} fill="currentColor" strokeWidth={0} className="h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </svg>
              See how it works
            </a>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function PillarCard({
  to,
  eyebrow,
  title,
  icon,
  tone,
}: {
  to: string;
  eyebrow: string;
  title: string;
  icon: string;
  tone: string;
}) {
  const className = `group relative flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white ${tone}`;
  const inner = (
    <>
      <Icon d={icon} className="absolute right-6 top-6 h-24 w-24 text-white/15" />
      <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-site-orange text-white transition group-hover:bg-white group-hover:text-site-deep">
        <Icon d={ARROW_UP_RIGHT} className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium text-site-orange">{eyebrow}</span>
      <span className="mt-1 font-heading text-3xl font-bold leading-tight">{title}</span>
    </>
  );
  return to.startsWith("#") ? (
    <a href={to} className={className}>
      {inner}
    </a>
  ) : (
    <Link to={to} className={className}>
      {inner}
    </Link>
  );
}

function Pillars() {
  return (
    <section aria-label="What ChangeRadar does" className="px-4">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <PillarCard
          to="#features"
          eyebrow="Monitor"
          title="Pages, feeds and APIs, watched around the clock"
          icon="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
          tone="bg-gradient-to-br from-site-navy to-slate-700"
        />
        <PillarCard
          to="/prices"
          eyebrow="Track"
          title="Prices across stores, live"
          icon="M3 3v18h18M7 15l4-4 3 3 5-6"
          tone="bg-gradient-to-br from-slate-700 to-site-navy"
        />
        <PillarCard
          to="#features"
          eyebrow="Notify"
          title="Alerts on the channels you care about"
          icon="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
          tone="bg-gradient-to-br from-site-ink to-site-navy"
        />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 px-4 py-20">
      <SectionHead id="features-title" eyebrow="What it does" title="Everything between a change and your inbox" />
      <ul className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-site-deep">
              <Icon d={f.icon} />
            </span>
            <h3 className="mt-5 font-heading text-2xl font-bold text-site-navy">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pipeline() {
  return (
    <section id="pipeline" aria-labelledby="pipeline-title" className="scroll-mt-24 bg-site-navy px-4 py-20 text-white">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow light>How it works</Eyebrow>
        <h2 id="pipeline-title" className="mt-4 font-heading text-4xl font-bold leading-tight sm:text-5xl">
          How a change travels
        </h2>
        <p className="mt-3 text-white/80">One monitor run, from the first request to the last notification.</p>
      </div>
      <ol className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.name} className="flex gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-site-orange font-heading text-xl font-bold text-site-navy"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-heading text-2xl font-bold">{s.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/80">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Architecture() {
  return (
    <section id="architecture" aria-labelledby="arch-title" className="scroll-mt-24 px-4 py-20">
      <SectionHead id="arch-title" eyebrow="Under the hood" title="One repo, clear boundaries">
        Three apps share a detection engine and one Postgres schema.
      </SectionHead>
      <ul className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PARTS.map((p) => (
          <li key={p.path} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <code className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-medium text-site-navy">{p.path}</code>
              <span className="text-xs font-semibold uppercase tracking-wider text-site-deep">{p.tech}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{p.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Quickstart() {
  const pre = "mt-4 overflow-x-auto rounded-xl bg-site-ink p-5 font-mono text-sm leading-relaxed text-slate-100";
  return (
    <section id="quickstart" aria-labelledby="quick-title" className="scroll-mt-24 bg-slate-50 px-4 py-20">
      <SectionHead id="quick-title" eyebrow="Get started" title="Run it locally">
        A one-shot migrate service applies the database migrations before the API, worker and scheduler start.
      </SectionHead>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 lg:grid-cols-2">
        {/* min-w-0 lets these grid children shrink so the code blocks scroll instead of widening the page. */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-7">
          <h3 className="font-heading text-2xl font-bold text-site-navy">With Docker</h3>
          <pre className={pre}>
            <code>{`cp .env.example .env\ndocker compose up --build`}</code>
          </pre>
          <h3 className="mt-8 font-heading text-2xl font-bold text-site-navy">Without Docker</h3>
          <p className="mt-2 text-sm text-slate-600">
            Use <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code>; the Makefile loads it automatically.
          </p>
          <pre className={pre}>
            <code>{`cp .env.local.example .env.local\nmake infra     # postgres, redis, minio\nmake install\nmake migrate\nmake api       # make worker, make beat\nmake web`}</code>
          </pre>
        </div>
        <div className="min-w-0 space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="font-heading text-2xl font-bold text-site-navy">Where things run</h3>
            <dl className="mt-4 divide-y divide-slate-100">
              {LINKS.map((l) => (
                <div key={l.label} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                  <dt className="font-medium text-slate-700">{l.label}</dt>
                  <dd className="font-mono text-site-navy">
                    {l.value}
                    {l.note && <span className="ml-2 font-sans text-slate-600">({l.note})</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="font-heading text-2xl font-bold text-site-navy">Testing</h3>
            <pre className={pre}>
              <code>{`make test        # api + worker unit tests\nmake test-e2e    # Playwright UI tests (stack running)`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-site-navy to-slate-700 px-6 py-14 text-center text-white sm:px-12">
        <h2 className="font-heading text-4xl font-bold sm:text-5xl">See it on live prices</h2>
        <p className="max-w-xl text-white/80">
          Open the VilaiWatch dashboard to compare stores, follow price history, and set a target price.
        </p>
        <Link to="/prices" className={btnPrimary}>
          Open dashboard
          <Icon d={ARROW} className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-site-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row">
        <span className="flex items-center gap-2.5">
          <LogoMark fillClass="fill-site-deep" className="h-7 w-7" />
          <span className="font-heading text-xl font-bold uppercase tracking-wide">
            Change<span className="text-site-orange">Radar</span>
          </span>
        </span>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-white/80">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <Link to="/prices" className="hover:text-white">
            Dashboard
          </Link>
          <Link to="/prices/search" className="hover:text-white">
            Search
          </Link>
          <Link to="/prices/alerts" className="hover:text-white">
            Alerts
          </Link>
        </nav>
        <p className="text-white/80">&copy; {new Date().getFullYear()} ChangeRadar</p>
      </div>
    </footer>
  );
}

export function Project() {
  return (
    <div className="overview min-h-full bg-white font-site text-slate-800">
      <Header />
      <main>
        <Hero />
        <Pillars />
        <Features />
        <Pipeline />
        <Architecture />
        <Quickstart />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
