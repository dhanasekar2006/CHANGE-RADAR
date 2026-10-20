import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDeals, useSearch, useTrackUrl } from "@/api/priceHooks";
import { DealCard, ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { SearchField } from "@/components/SearchField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";
import { useDebounce } from "@/hooks/useDebounce";

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full !rounded-card" />
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
    <div className="space-y-10">
      <section className="space-y-5">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">Find the best price</h1>
          <p className="mt-1 text-[15px] text-ink-2">Compare stores, watch price history, and get alerted when a price drops.</p>
        </div>
        <SearchField value={text} onChange={setText} autoFocus />

        {search.isPending ? (
          <CardSkeletons />
        ) : search.isError ? (
          <ErrorState error={search.error} onRetry={() => search.refetch()} />
        ) : search.data.items.length > 0 ? (
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${search.isPlaceholderData ? "opacity-60" : ""}`}>
            {search.data.items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : isUrl ? (
          <EmptyState title="We're not tracking this link yet" hint="Start tracking it and we'll check its price regularly.">
            {authed ? (
              <Button onClick={trackLink} disabled={track.isPending}>
                {track.isPending ? "Fetching price…" : "Track this link"}
              </Button>
            ) : (
              <ButtonLink to="/login?next=/prices">Sign in to track it</ButtonLink>
            )}
            {track.isError && (
              <p role="alert" className="mt-3 text-sm text-warn">
                {track.error instanceof Error ? track.error.message : "Couldn't track that link."}
              </p>
            )}
          </EmptyState>
        ) : (
          <EmptyState
            title={q ? `No products match "${q}"` : "Nothing is being tracked yet"}
            hint={q ? "Try a different name, or paste the product's store link to track it." : "Paste a store link above to start."}
          />
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold leading-[30px] text-ink">Biggest price drops</h2>
          <p className="mt-1 text-[13px] text-ink-2">Cheapest in-stock price versus its 30-day average.</p>
        </div>
        {deals.isPending ? (
          <CardSkeletons />
        ) : deals.isError ? (
          <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
        ) : deals.data.length === 0 ? (
          <EmptyState title="No price drops right now" hint="Deals appear here when a price falls below its recent average." />
        ) : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {deals.data.map((deal) => (
              <DealCard key={deal.product_id} deal={deal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
