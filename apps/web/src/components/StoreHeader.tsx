import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAlerts } from "@/api/priceHooks";
import { Logo } from "@/components/Logo";
import { useAuthed } from "@/hooks/useAuthed";

// Header for the light storefront home page: info bar, logo/search/account row, blue nav bar.

const NAV: { label: string; to?: string; href?: string }[] = [
  { label: "Home", to: "/" },
  { label: "Price drops", href: "#drops" },
  { label: "Search", to: "/prices/search" },
  { label: "Alerts", to: "/prices/alerts" },
  { label: "Dashboard", to: "/prices" },
  { label: "About", to: "/project" },
];

const iconProps = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const navItemClass =
  "block border-t border-white/20 px-5 py-3 text-center font-display text-lg tracking-wide transition hover:bg-white/10 md:border-r md:border-t-0";

export function StoreHeader() {
  const navigate = useNavigate();
  const authed = useAuthed();
  const alerts = useAlerts(authed);
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const activeAlerts = alerts.data?.filter((a) => !a.triggered_at).length ?? 0;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    navigate(q ? `/prices/search?q=${encodeURIComponent(q)}` : "/prices/search");
  }

  return (
    <header>
      <div className="bg-shop-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs sm:text-sm">
          <p>
            <strong className="font-bold uppercase">Live prices</strong>{" "}
            <span className="text-white/90">rechecked every 30 minutes across stores.</span>
          </p>
          <p className="hidden items-center gap-4 md:flex">
            <span>Prices in ₹</span>
            <span aria-hidden className="h-4 w-px bg-white/40" />
            <span>Email, WhatsApp &amp; Telegram alerts</span>
          </p>
        </div>
      </div>
      <div aria-hidden className="sf-zigzag" />

      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
          <Link to="/" aria-label="VilaiWatch home" className="order-1 text-shop-ink">
            <Logo name="VilaiWatch" />
          </Link>

          <form
            role="search"
            onSubmit={onSearch}
            className="order-3 flex w-full items-center rounded-full border-2 border-slate-200 bg-white pl-5 pr-1 focus-within:border-shop-blue md:order-2 md:mx-auto md:w-auto md:max-w-xl md:flex-1"
          >
            <label htmlFor="store-search" className="sr-only">
              Search products or paste a store link
            </label>
            <input
              id="store-search"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search a product or paste a store link…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            >
              <svg {...iconProps} className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>

          <div className="order-2 ml-auto flex items-center gap-5 md:order-3 md:ml-0">
            <Link
              to={authed ? "/prices" : "/login?next=/prices"}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-shop-blue"
            >
              <svg {...iconProps} className="h-5 w-5">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              <span className="hidden sm:inline">{authed ? "My account" : "Sign in"}</span>
            </Link>
            <Link
              to="/prices/alerts"
              aria-label={`Price alerts, ${activeAlerts} active`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 text-shop-ink transition hover:border-shop-blue hover:text-shop-blue"
            >
              <svg {...iconProps} className="h-5 w-5">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span
                aria-hidden
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-shop-blue px-1 text-[11px] font-bold text-white"
              >
                {activeAlerts}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label="Primary" className="bg-shop-blue text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between py-2 md:hidden">
            <span className="font-display text-lg">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="store-menu"
              aria-label="Toggle menu"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/40"
            >
              <svg {...iconProps} className="h-5 w-5" strokeWidth={2}>
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
          <ul id="store-menu" className={`${menuOpen ? "block" : "hidden"} md:flex md:border-l md:border-white/20`}>
            {NAV.map((item) => (
              <li key={item.label} className="md:flex-1">
                {item.to ? (
                  <Link
                    to={item.to}
                    aria-current={item.to === "/" ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={navItemClass}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a href={item.href} onClick={() => setMenuOpen(false)} className={navItemClass}>
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
