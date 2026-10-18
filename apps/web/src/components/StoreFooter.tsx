import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";

const LINKS = [
  { label: "Search products", to: "/prices/search" },
  { label: "Price alerts", to: "/prices/alerts" },
  { label: "Dashboard", to: "/prices" },
  { label: "About", to: "/project" },
];

export function StoreFooter({ categories }: { categories: string[] }) {
  return (
    <footer className="mt-16 bg-shop-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <section>
          <span className="text-white">
            <Logo name="VilaiWatch" />
          </span>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
            Track prices across stores, follow their history and get alerted when a price drops.
          </p>
        </section>

        <section aria-labelledby="footer-categories">
          <h2 id="footer-categories" className="font-display text-xl tracking-wide">
            Categories
          </h2>
          {categories.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c}>
                  <Link
                    to={`/prices/search?q=${encodeURIComponent(c)}`}
                    className="inline-block rounded border border-white/30 px-3 py-1 text-sm text-white/90 transition hover:border-white hover:text-white"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-white/80">Categories appear once products are tracked.</p>
          )}
        </section>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="font-display text-xl tracking-wide">
            Quick links
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/80 transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-sm text-white/80">
        &copy; {new Date().getFullYear()} VilaiWatch · Prices in ₹
      </div>
    </footer>
  );
}
