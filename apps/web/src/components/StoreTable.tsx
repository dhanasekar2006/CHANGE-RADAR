import { ExternalLink } from "lucide-react";

import { FlashPrice } from "@/components/FlashPrice";
import { EmptyState } from "@/components/QueryState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import type { Listing } from "@/types/prices";

/** One row per store, cheapest first, with the Best pill and a flash on live price moves. */
export function StoreTable({ listings, productId }: { listings: Listing[]; productId: string }) {
  return listings.length === 0 ? (
    <EmptyState title="No stores tracked for this product yet" />
  ) : (
    <Card className="divide-y divide-line !p-2 sm:!p-3">
      {listings.map((listing) => (
        <div key={listing.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-4">
          <div className="min-w-[8rem] flex-1">
            <p className="flex items-center gap-2 text-[15px] font-bold capitalize text-ink">
              {listing.store}
              {listing.is_best && <Badge tone="accent">Best</Badge>}
            </p>
            <p className="text-[13px] text-ink-2">
              {listing.in_stock ? "In stock" : "Out of stock"} · <UpdatedAgo checkedAt={listing.last_checked_at} prefix="Checked" />
            </p>
          </div>
          <div className="text-lg font-extrabold text-ink">
            {listing.price === null ? (
              <span className="text-[13px] font-normal text-ink-2">Waiting for first check</span>
            ) : (
              <FlashPrice productId={productId} store={listing.store} price={listing.price} />
            )}
          </div>
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`View on ${listing.store}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-accent-strong hover:bg-surface-2"
          >
            View <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
          </a>
        </div>
      ))}
    </Card>
  );
}
