import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useDeals, useSearch, useTrackUrl } from "@/api/priceHooks";
import { DealCard, ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { Skeleton } from "@/components/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";
import { useDebounce } from "@/hooks/useDebounce";

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="card flex gap-3.5 p-3.5"
        >
          <Skeleton className="h-16 w-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const authed = useAuthed();
  // The storefront header and category links arrive here as /prices/search?q=…
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const q = useDebounce(text.trim(), 300);

  const search = useSearch(q);
  const deals = useDeals();
  const track = useTrackUrl();

  const isUrl = /^https?:\/\//i.test(q);

  async function trackLink() {
    const product = await track.mutateAsync(q);
    navigate(`/prices/p/${product.id}`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="space-y-3 pt-4 text-center">
          <p className="eyebrow">Live price tracking</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find the best price, before it changes.
          </h1>
          <p className="mx-auto max-w-xl text-slate-500">
            Compare stores, watch price history, and get alerted the moment a price drops.
          </p>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          type="search"
          autoFocus
          placeholder="Search a product, or paste a store link"
          aria-label="Search products or paste a store link"
          className="input mx-auto !block max-w-2xl !rounded-xl !px-5 !py-3.5 !text-base shadow-glow"
        />

        {search.isPending ? (
          <CardSkeletons />
        ) : search.isError ? (
          <ErrorState error={search.error} onRetry={() => search.refetch()} />
        ) : search.data.items.length > 0 ? (
          <div
            className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${search.isPlaceholderData ? "opacity-60" : ""}`}
          >
            {search.data.items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : isUrl ? (
          <EmptyState
            title="We're not tracking this link yet"
            hint="Start tracking it and we'll check its price regularly."
          >
            {authed ? (
              <button
                onClick={trackLink}
                disabled={track.isPending}
                className="btn-primary"
              >
                {track.isPending ? "Fetching price…" : "Track this link"}
              </button>
            ) : (
              <Link
                to="/login?next=/prices"
                className="btn-primary"
              >
                Sign in to track it
              </Link>
            )}
            {track.isError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {track.error instanceof Error
                  ? track.error.message
                  : "Couldn't track that link."}
              </p>
            )}
          </EmptyState>
        ) : (
          <EmptyState
            title={
              q ? `No products match "${q}"` : "Nothing is being tracked yet"
            }
            hint={
              q
                ? "Try a different name, or paste the product's store link to track it."
                : "Paste a store link above to start."
            }
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Biggest price drops</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Cheapest in-stock price versus its 30-day average.
        </p>
        {deals.isPending ? (
          <CardSkeletons />
        ) : deals.isError ? (
          <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
        ) : deals.data.length === 0 ? (
          <EmptyState
            title="No price drops right now"
            hint="Deals appear here when a price falls below its recent average."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deals.data.map((deal) => (
              <DealCard key={deal.product_id} deal={deal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
