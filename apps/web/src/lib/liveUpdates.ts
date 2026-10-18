import type { HistoryPoint, Listing, PriceUpdateMessage, ProductDetail } from "@/types/prices";

function sameListing(listing: Listing, msg: PriceUpdateMessage): boolean {
  return msg.listing_id ? listing.id === msg.listing_id : listing.store === msg.store;
}

/** Cheapest in-stock listing with a price; ties go to the earlier (already sorted) one. */
function pickBest(listings: Listing[]): Listing | undefined {
  return listings
    .filter((l) => l.in_stock && l.price !== null)
    .reduce<Listing | undefined>((best, l) => (best === undefined || l.price! < best.price! ? l : best), undefined);
}

function latest(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

/**
 * Applies a live price message to a cached product detail: the matching store's
 * price/stock/timestamp, plus the derived Best badge and best price.
 *
 * Returns the same object when nothing applies (unknown store, or a message
 * older than what's already shown) so callers can skip a re-render.
 */
export function applyPriceUpdate(detail: ProductDetail, msg: PriceUpdateMessage): ProductDetail {
  if (detail.id !== msg.product_id) return detail;
  const target = detail.listings.find((l) => sameListing(l, msg));
  if (!target) return detail;
  if (target.last_checked_at && new Date(msg.checked_at) < new Date(target.last_checked_at)) return detail;

  const updated = detail.listings
    .map((l) =>
      l === target
        ? { ...l, price: msg.price, in_stock: msg.in_stock ?? l.in_stock, last_checked_at: msg.checked_at }
        : l,
    )
    .sort((a, b) => (a.price === null ? 1 : b.price === null ? -1 : a.price - b.price) || a.store.localeCompare(b.store));

  const best = pickBest(updated);
  return {
    ...detail,
    listings: updated.map((l) => ({ ...l, is_best: best !== undefined && l.id === best.id })),
    best_price: best?.price ?? null,
    best_store: best?.store ?? null,
    last_checked_at: latest(detail.last_checked_at, msg.checked_at),
  };
}

/** True when the message reports an actual price change (the backend also publishes unchanged re-checks). */
export function isPriceChange(msg: PriceUpdateMessage): boolean {
  return msg.old_price !== null && msg.old_price !== msg.price;
}

/** Adds the new price to a history series so the chart and stats move without a refetch. */
export function appendHistoryPoint(history: HistoryPoint[], msg: PriceUpdateMessage): HistoryPoint[] {
  if (msg.old_price !== null && msg.old_price === msg.price) return history;
  if (history.some((p) => p.store === msg.store && p.date === msg.checked_at)) return history;
  return [...history, { date: msg.checked_at, price: msg.price, store: msg.store }].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
