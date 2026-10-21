import { ChevronLeft, ChevronRight, Menu, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useDeals, useSearch } from "@/api/priceHooks";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreHeader } from "@/components/StoreHeader";
import { ProductArt } from "@/components/ui/ProductArt";
import { formatINR } from "@/lib/format";
import { STOREFRONT_FONTS, loadFonts } from "@/lib/loadFonts";
import { artKind } from "@/lib/productArt";
import type { Deal } from "@/types/prices";

// Public storefront home: deals slider + category list, then a price-drops section.
// Light themed like the landing page; the dashboard pages behind it stay dark.

// Runs when this route chunk loads, before first paint of the page.
loadFonts(STOREFRONT_FONTS);

const PAGE_SIZE = 6;
const SLIDE_MS = 6000;

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  to: string;
  image: string | null;
}

const FALLBACK_SLIDE: Slide = {
  key: "welcome",
  eyebrow: "Live price tracking",
  title: "Buy at the right price",
  text: "Compare stores, follow price history and get alerted the moment a price drops.",
  cta: "Start tracking",
  to: "/prices/search",
  image: null,
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function toSlide(deal: Deal): Slide {
  return {
    key: deal.product_id,
    eyebrow: `Price drop · −${deal.drop_pct.toFixed(1)}%`,
    title: deal.name,
    text: `${formatINR(deal.price)} at ${capitalize(deal.store)}, down from its ${formatINR(deal.avg_30d)} 30-day average.`,
    cta: "View deal",
    to: `/prices/p/${deal.product_id}`,
    image: deal.image_url,
  };
}

function Thumb({
  name,
  src,
  className = "",
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt=""
      width={96}
      height={96}
      loading="lazy"
      decoding="async"
      className={`bg-shop-mist object-cover ${className}`}
    />
  ) : (
    <ProductArt kind={artKind(name, null)} className={className} />
  );
}

const arrowBtn =
  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40";

function HeroSlider({ deals, loading }: { deals: Deal[]; loading: boolean }) {
  const slides =
    deals.length > 0 ? deals.slice(0, 3).map(toSlide) : [FALLBACK_SLIDE];
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!playing || held || count < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      SLIDE_MS,
    );
    return () => window.clearInterval(id);
  }, [playing, held, count]);

  if (loading && deals.length === 0) {
    return (
      <div
        aria-busy="true"
        className="min-h-[20rem] animate-pulse bg-shop-ink/90 lg:min-h-[22rem]"
      />
    );
  }

  const current = slides[index % count];
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured price drops"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="relative min-h-[20rem] overflow-hidden bg-shop-ink text-white lg:min-h-[22rem]"
    >
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${(index % count) + 1} of ${count}`}
        aria-live={playing ? "off" : "polite"}
        className="absolute inset-0"
      >
        {current.image ? (
          <img
            src={current.image}
            alt=""
            width={1280}
            height={352}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-shop-ink via-shop-ink to-shop-blue" />
            <ProductArt
              kind={artKind(current.title, null)}
              className="absolute right-[4%] top-1/2 hidden h-72 w-72 -translate-y-1/2 !bg-transparent md:block"
            />
          </>
        )}
        <div className="absolute inset-y-0 left-[6%] right-[6%] flex flex-col justify-center pb-10 md:right-[35%]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm">
            {current.eyebrow}
          </p>
          <h2 className="mt-2 line-clamp-3 font-display text-3xl leading-tight tracking-wide sm:text-4xl lg:text-5xl">
            {current.title}
          </h2>
          <span aria-hidden className="my-4 block h-1 w-16 bg-sky-400" />
          <p className="hidden max-w-md text-sm text-slate-200 sm:block">
            {current.text}
          </p>
          <Link
            to={current.to}
            className="mt-5 inline-flex w-fit rounded-full bg-shop-blue px-6 py-2.5 font-display text-base uppercase tracking-wider text-white ring-1 ring-white/30 transition hover:bg-white hover:text-shop-ink"
          >
            {current.cta}
          </Link>
        </div>
      </div>

      {count > 1 && (
        <div className="absolute inset-x-[6%] bottom-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index % count}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full border-2 border-white ${i === index % count ? "bg-white" : ""}`}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-white"
            >
              {playing ? (
                <Pause size={12} fill="currentColor" aria-hidden />
              ) : (
                <Play size={12} fill="currentColor" aria-hidden />
              )}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className={`${arrowBtn} border-white text-white hover:bg-white hover:text-shop-ink`}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className={`${arrowBtn} border-shop-blue bg-shop-blue text-white hover:border-white`}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryList({
  categories,
  loading,
}: {
  categories: string[];
  loading: boolean;
}) {
  const rowClass =
    "flex items-center justify-between px-5 py-3 text-sm text-slate-700 transition hover:bg-shop-mist hover:text-shop-blue";
  const caret = (
    <ChevronRight size={14} aria-hidden className="text-slate-500" />
  );

  return (
    <aside aria-labelledby="categories-title" className="self-start bg-white">
      <h2
        id="categories-title"
        className="flex items-center gap-3 bg-shop-ink px-5 py-4 font-display text-lg uppercase tracking-wider text-white"
      >
        <Menu size={16} aria-hidden />
        All categories
      </h2>
      <ul className="divide-y divide-dashed divide-slate-200">
        {loading ? (
          [0, 1, 2].map((i) => (
            <li key={i} className="px-5 py-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </li>
          ))
        ) : (
          <>
            {categories.map((c) => (
              <li key={c}>
                <Link
                  to={`/prices/search?q=${encodeURIComponent(c)}`}
                  className={rowClass}
                >
                  {c}
                  {caret}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/prices/search" className={`${rowClass} font-semibold`}>
                All products
                {caret}
              </Link>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
}

function PriceDrops({
  deals,
  loading,
  failed,
}: {
  deals: Deal[];
  loading: boolean;
  failed: boolean;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(deals.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = deals.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const featured = deals[0];

  return (
    <section
      id="drops"
      aria-labelledby="drops-title"
      className="mx-auto mt-12 max-w-6xl scroll-mt-4 px-4"
    >
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        {featured ? (
          <div className="flex flex-col bg-shop-mist p-5">
            <p className="font-display text-4xl uppercase tracking-wide text-shop-ink">
              Sale
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-slate-700">
              Up to {Math.round(featured.drop_pct)}% off
            </p>
            <p className="mt-3 line-clamp-2 text-sm font-medium text-shop-ink">
              {featured.name}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-bold text-shop-ink">
                {formatINR(featured.price)}
              </span>{" "}
              <del className="text-slate-600">
                {formatINR(featured.avg_30d)}
              </del>
            </p>
            <Link
              to={`/prices/p/${featured.product_id}`}
              className="mt-4 inline-flex w-fit rounded-full bg-shop-blue px-5 py-2 font-display text-sm uppercase tracking-wider text-white transition hover:bg-shop-ink"
            >
              View deal
            </Link>
            <Thumb
              name={featured.name}
              src={featured.image_url}
              className="mt-5 min-h-[10rem] flex-1 rounded-lg"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="hidden min-h-[16rem] bg-shop-mist lg:block"
          />
        )}

        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="drops-title"
                className="font-display text-2xl uppercase tracking-wider text-shop-ink"
              >
                Price drops
              </h2>
              <span aria-hidden className="mt-1 block h-1 w-12 bg-shop-blue" />
              <p className="mt-2 text-sm text-slate-600">
                Cheapest in-stock price vs its 30-day average.
              </p>
            </div>
            {pages > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, current - 1))}
                  disabled={current === 0}
                  aria-label="Previous deals"
                  className={`${arrowBtn} border-shop-ink text-shop-ink hover:bg-shop-ink hover:text-white`}
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pages - 1, current + 1))}
                  disabled={current === pages - 1}
                  aria-label="Next deals"
                  className={`${arrowBtn} border-shop-blue bg-shop-blue text-white hover:border-shop-ink hover:bg-shop-ink`}
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div aria-busy="true" className="mt-6 grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded bg-shop-mist"
                />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {visible.map((deal) => (
                <li key={deal.product_id}>
                  <Link
                    to={`/prices/p/${deal.product_id}`}
                    className="group flex items-center gap-4"
                  >
                    <Thumb
                      name={deal.name}
                      src={deal.image_url}
                      className="h-24 w-24 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-display text-lg leading-snug tracking-wide text-shop-ink transition group-hover:text-shop-blue">
                        {deal.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        at <span className="capitalize">{deal.store}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-bold text-shop-ink">
                          {formatINR(deal.price)}
                        </span>
                        <del className="text-slate-600">
                          {formatINR(deal.avg_30d)}
                        </del>
                        <span className="text-xs font-semibold text-emerald-700">
                          −{deal.drop_pct.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
              {failed
                ? "Deals couldn't be loaded right now."
                : "No price drops right now. They appear here when a price falls below its recent average."}{" "}
              <Link
                to="/prices/search"
                className="font-semibold text-shop-blue underline"
              >
                Track a product
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Storefront() {
  const deals = useDeals();
  const tracked = useSearch("");

  const dealList = deals.data ?? [];
  const categories = [
    ...new Set(
      (tracked.data?.items ?? [])
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort();

  return (
    <div className="storefront min-h-full bg-white font-shop text-slate-800">
      <StoreHeader />
      <main>
        <div className="bg-shop-mist py-5">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 lg:grid-cols-[1fr_17.5rem]">
            <HeroSlider deals={dealList} loading={deals.isPending} />
            <CategoryList categories={categories} loading={tracked.isPending} />
          </div>
        </div>
        <PriceDrops
          deals={dealList}
          loading={deals.isPending}
          failed={deals.isError}
        />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
