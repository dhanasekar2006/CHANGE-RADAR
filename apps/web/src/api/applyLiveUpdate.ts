import type { QueryClient } from "@tanstack/react-query";

import { priceKeys } from "@/api/priceKeys";
import { formatINR } from "@/lib/format";
import { appendHistoryPoint, applyPriceUpdate, isPriceChange } from "@/lib/liveUpdates";
import { flashKey, useLiveStore } from "@/store/live";
import { useToastStore } from "@/store/toasts";
import type { HistoryPoint, PriceAlert, PriceUpdateMessage, ProductDetail } from "@/types/prices";

/** Alert ids we've already toasted this session, so a repeat message doesn't toast twice. */
const toasted = new Set<string>();

/**
 * Pushes one live price message into the TanStack Query cache so the product
 * page, Best badge, stats and chart update with no reload, then flashes the
 * price and fires a toast if it reached a tracked target.
 */
export function applyLiveUpdate(queryClient: QueryClient, msg: PriceUpdateMessage): void {
  const productKey = priceKeys.product(msg.product_id);
  const cached = queryClient.getQueryData<ProductDetail>(productKey);

  if (cached) {
    const next = applyPriceUpdate(cached, msg);
    if (next !== cached) queryClient.setQueryData(productKey, next);
    else if (!cached.listings.some((l) => (msg.listing_id ? l.id === msg.listing_id : l.store === msg.store))) {
      // A store we haven't loaded yet (new listing): fetch the full detail.
      void queryClient.invalidateQueries({ queryKey: productKey });
    }
  }

  // Unchanged re-checks leave history alone (appendHistoryPoint returns it as-is);
  // a store's very first price (no old price) does add a point.
  queryClient.setQueriesData<HistoryPoint[]>({ queryKey: priceKeys.historyAll(msg.product_id) }, (history) =>
    history ? appendHistoryPoint(history, msg) : history,
  );

  if (isPriceChange(msg)) {
    // Lists that show a derived best price / drop % are cheaper to refetch than to patch.
    void queryClient.invalidateQueries({ queryKey: priceKeys.deals });
    void queryClient.invalidateQueries({ queryKey: priceKeys.searchAll });

    useLiveStore.getState().flash(flashKey(msg.product_id, msg.store), msg.price < msg.old_price! ? "down" : "up");
  }

  notifyTargetHits(queryClient, msg);
}

function notifyTargetHits(queryClient: QueryClient, msg: PriceUpdateMessage): void {
  if (msg.in_stock === false) return;
  const alerts = queryClient.getQueryData<PriceAlert[]>(priceKeys.alerts);
  const hits = alerts?.filter(
    (a) =>
      a.product_id === msg.product_id &&
      a.triggered_at === null &&
      !a.id.startsWith("pending-") &&
      msg.price <= a.target_price &&
      !toasted.has(a.id),
  );
  if (!hits?.length) return;

  for (const alert of hits) {
    toasted.add(alert.id);
    useToastStore.getState().push({
      tone: "success",
      title: "Target price reached",
      body: `${alert.product_name} is now ${formatINR(msg.price)} at ${msg.store} (your target: ${formatINR(alert.target_price)}).`,
    });
  }
  // The worker marks these triggered; pick that up.
  void queryClient.invalidateQueries({ queryKey: priceKeys.alerts });
}
