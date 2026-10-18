// Decorative product preview for the landing hero: three cards over a brand-colored circle.
// Built from CSS/SVG so there are no image assets to host. Numbers are illustrative only.

const STORES = [
  { name: "Store A", price: "₹24,990", best: true },
  { name: "Store B", price: "₹25,490", best: false },
  { name: "Store C", price: "₹26,990", best: false },
];

export function HeroVisual() {
  return (
    <figure className="relative mx-auto h-[22rem] w-full max-w-[38rem] sm:h-[24rem]">
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[2.5rem] sm:overflow-visible sm:rounded-none">
        {/* Brand circle, bleeding off the right edge like the reference design. */}
        <div className="absolute -right-24 -top-10 h-[34rem] w-[34rem] rounded-full bg-sky-600 sm:-right-40 sm:-top-16 sm:h-[40rem] sm:w-[40rem]" />
        {/* Dot grid accent. */}
        <div
          className="absolute right-6 top-4 h-24 w-24 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.9) 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
        />

        {/* Left: product + best price */}
        <div className="absolute left-0 top-14 hidden w-36 -rotate-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-900/5 sm:block">
          <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-slate-100 text-3xl font-bold text-sky-600">
            W
          </div>
          <p className="mt-3 text-sm font-semibold leading-tight text-slate-900">Wireless Headphones</p>
          <p className="text-xs text-slate-600">3 stores</p>
          <p className="mt-1 text-sm">
            <span className="text-slate-600">from </span>
            <span className="font-bold text-emerald-700">₹24,990</span>
          </p>
        </div>

        {/* Center: price history + target reached */}
        <div className="absolute left-1/2 top-0 z-10 w-52 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Price history</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">3M</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">₹24,990</p>
          <p className="mt-1">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ↓ 8.2% vs 30-day avg
            </span>
          </p>
          <svg viewBox="0 0 180 80" className="mt-3 h-20 w-full" role="presentation">
            <defs>
              <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#5659e0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#5659e0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon fill="url(#hero-area)" points="0,12 22,16 44,13 66,28 88,31 110,42 132,46 154,60 180,64 180,80 0,80" />
            <polyline
              fill="none"
              stroke="#5659e0"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,12 22,16 44,13 66,28 88,31 110,42 132,46 154,60 180,64"
            />
            <circle cx="180" cy="64" r="4" fill="#5659e0" />
          </svg>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sky-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <p className="text-xs font-medium text-sky-800">Target ₹25,000 reached</p>
          </div>
        </div>

        {/* Right: store comparison */}
        <div className="absolute right-0 top-28 hidden w-36 rotate-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-900/5 sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Compare stores</p>
          <ul className="mt-2 space-y-1">
            {STORES.map((s) => (
              <li
                key={s.name}
                className={`flex items-center justify-between rounded-md px-1.5 py-1 text-xs ${s.best ? "bg-emerald-50 font-bold text-emerald-700" : "text-slate-700"}`}
              >
                <span>{s.name}</span>
                <span>{s.price}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5">
        Illustrative preview
      </figcaption>
    </figure>
  );
}
