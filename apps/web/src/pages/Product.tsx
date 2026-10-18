import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  useAlerts,
  useDeleteAlert,
  useHistory,
  useProduct,
} from "@/api/priceHooks";
import { AlertForm } from "@/components/AlertForm";
import { PriceChart } from "@/components/PriceChart";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { Skeleton } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { StoreTable } from "@/components/StoreTable";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { useAuthed } from "@/hooks/useAuthed";
import { useNow } from "@/hooks/useNow";
import { formatINR, formatPct } from "@/lib/format";
import {
  bestPriceSeries,
  buildStoreSeries,
  buyAdvice,
  computeStats,
  type AdviceTone,
  type PriceStats,
} from "@/lib/priceStats";
import type { HistoryRange } from "@/types/prices";

const RANGES: HistoryRange[] = ["1M", "3M", "6M"];
const RANGE_LABEL: Record<HistoryRange, string> = {
  "1M": "month",
  "3M": "3 months",
  "6M": "6 months",
};

const ADVICE_STYLE: Record<AdviceTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  fair: "border-slate-800 bg-white text-slate-200",
  wait: "border-amber-200 bg-amber-50 text-amber-800",
  unknown: "border-slate-800 bg-white text-slate-300",
};

export function Product() {
  const { productId } = useParams<{ productId: string }>();
  const [range, setRange] = useState<HistoryRange>("3M");
  const now = useNow(30_000);
  const authed = useAuthed();

  const product = useProduct(productId);
  const history = useHistory(productId, range);
  const alerts = useAlerts(authed);
  const deleteAlert = useDeleteAlert();

  // Lowest / average / highest and the buy advice come from the real history for the chosen range.
  const { stats, advice, best } = useMemo(() => {
    const best = bestPriceSeries(buildStoreSeries(history.data ?? []));
    const raw = computeStats(best, now);
    // Use the live best in-stock price as "current" so the advice matches the number shown above.
    const current = product.data?.best_price ?? raw?.current;
    const stats: PriceStats | null =
      raw && current !== undefined
        ? {
            ...raw,
            current,
            lowest: Math.min(raw.lowest, current),
            highest: Math.max(raw.highest, current),
          }
        : raw;
    return {
      stats,
      best,
      advice: buyAdvice(stats, best, RANGE_LABEL[range], now),
    };
  }, [history.data, product.data?.best_price, range, now]);

  if (product.isPending) return <ProductSkeleton />;
  if (product.isError)
    return (
      <ErrorState error={product.error} onRetry={() => product.refetch()} />
    );

  const detail = product.data;
  const myAlerts = (alerts.data ?? []).filter(
    (a) => a.product_id === detail.id,
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/prices/search"
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← Search
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{detail.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {detail.category ? `${detail.category} · ` : ""}
          <UpdatedAgo checkedAt={detail.last_checked_at} />
        </p>
      </div>

      {/* Stores */}
      <section aria-label="Prices by store" className="space-y-3">
        <h2 className="text-lg font-semibold">Prices by store</h2>
        <StoreTable listings={detail.listings} productId={detail.id} />
      </section>

      {/* History */}
      <section aria-label="Price history" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Price history</h2>
          <div role="tablist" aria-label="Range" className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={r === range}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1 text-sm ${r === range ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {history.isPending ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : history.data.length === 0 ? (
          <EmptyState
            title="No price history yet"
            hint="The first check hasn't recorded a price. Check back soon."
          />
        ) : (
          <>
            <div
              className={`rounded-lg border p-4 ${ADVICE_STYLE[advice.tone]}`}
            >
              <p className="font-semibold">{advice.headline}</p>
              <p className="mt-0.5 text-sm opacity-80">{advice.detail}</p>
            </div>

            {stats && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Lowest" value={formatINR(stats.lowest)} />
                <StatCard
                  label="Average"
                  value={formatINR(Math.round(stats.average))}
                />
                <StatCard label="Highest" value={formatINR(stats.highest)} />
                <StatCard
                  label="Now vs average"
                  value={formatPct(
                    ((stats.current - stats.average) / stats.average) * 100,
                  )}
                  tone={stats.current <= stats.average ? "good" : "bad"}
                />
              </dl>
            )}

            <div
              className={`rounded-lg border border-slate-800 p-3 ${history.isPlaceholderData ? "opacity-60" : ""}`}
            >
              <PriceChart history={history.data} range={range} now={now} />
            </div>
            {best.length < 2 && (
              <p className="text-xs text-slate-500">
                Only one price recorded so far, so the chart is flat.
              </p>
            )}
          </>
        )}
      </section>

      {/* Alerts */}
      <section aria-label="Price alert" className="max-w-md space-y-3">
        <h2 className="text-lg font-semibold">Price alert</h2>
        {myAlerts.length > 0 && (
          <ul className="space-y-2">
            {myAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 text-sm"
              >
                <span>
                  At or below <strong>{formatINR(alert.target_price)}</strong>
                  {alert.triggered_at && (
                    <span className="ml-2 text-xs text-emerald-400">
                      triggered
                    </span>
                  )}
                </span>
                <button
                  onClick={() => deleteAlert.mutate(alert.id)}
                  className="text-xs text-slate-400 hover:text-red-400"
                  aria-label={`Remove alert at ${formatINR(alert.target_price)}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <AlertForm
          productId={detail.id}
          productName={detail.name}
          bestPrice={detail.best_price}
        />
      </section>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
