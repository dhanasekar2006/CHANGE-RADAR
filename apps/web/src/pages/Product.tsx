import clsx from "clsx";
import { ProductArt } from "@/components/ui/ProductArt";
import { artKind } from "@/lib/productArt";
import { ArrowLeft, BellPlus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import { StatCard } from "@/components/StatCard";
import { StoreTable } from "@/components/StoreTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PriceTag } from "@/components/ui/PriceTag";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { useAuthed } from "@/hooks/useAuthed";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
import type { HistoryRange, PriceAlert } from "@/types/prices";

const RANGES: HistoryRange[] = ["1M", "3M", "6M"];
const RANGE_LABEL: Record<HistoryRange, string> = {
  "1M": "month",
  "3M": "3 months",
  "6M": "6 months",
};

const ADVICE_STYLE: Record<AdviceTone, string> = {
  good: "bg-good-soft text-good",
  fair: "bg-surface-2 text-ink",
  wait: "bg-warn-soft text-warn",
  unknown: "bg-surface-2 text-ink",
};

function AlertPanel({
  productId,
  productName,
  bestPrice,
  alerts,
}: {
  productId: string;
  productName: string;
  bestPrice: number | null;
  alerts: PriceAlert[];
}) {
  const deleteAlert = useDeleteAlert();
  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between gap-3 rounded-row bg-surface-2 px-4 py-3 text-[15px]"
            >
              <span className="text-ink">
                At or below{" "}
                <strong className="tabular-nums">
                  {formatINR(alert.target_price)}
                </strong>
                {alert.triggered_at && (
                  <Badge tone="good">Target reached</Badge>
                )}
              </span>
              <button
                onClick={() => deleteAlert.mutate(alert.id)}
                className="min-h-[44px] px-2 text-[13px] font-bold text-ink-2 hover:text-warn"
                aria-label={`Remove alert at ${formatINR(alert.target_price)}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <AlertForm
        productId={productId}
        productName={productName}
        bestPrice={bestPrice}
      />
    </div>
  );
}

export function Product() {
  const { productId } = useParams<{ productId: string }>();
  const [range, setRange] = useState<HistoryRange>("3M");
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const now = useNow(30_000);
  const authed = useAuthed();

  const product = useProduct(productId);
  const history = useHistory(productId, range);
  const alerts = useAlerts(authed);

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
  const changeVsAverage = stats
    ? ((stats.current - stats.average) / stats.average) * 100
    : null;
  const atLow =
    stats !== null &&
    advice.tone !== "unknown" &&
    stats.current <= stats.lowest * 1.02;

  const panel = (
    <AlertPanel
      productId={detail.id}
      productName={detail.name}
      bestPrice={detail.best_price}
      alerts={myAlerts}
    />
  );

  return (
    <div className={clsx("space-y-6", !isDesktop && "pb-20")}>
      <Link
        to="/prices/search"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden /> Search
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <Card className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
            {detail.image_url ? (
              <img
                src={detail.image_url}
                alt=""
                className="aspect-square w-full rounded-[20px] bg-surface-2 object-cover"
              />
            ) : (
              <ProductArt
                kind={artKind(detail.name, detail.category)}
                className="aspect-square w-full rounded-[20px]"
              />
            )}
            <div className="space-y-3">
              <p className="text-[13px] text-ink-2">
                {detail.category ? `${detail.category} · ` : ""}
                <UpdatedAgo checkedAt={detail.last_checked_at} />
              </p>
              <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
                {detail.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <PriceTag
                  price={detail.best_price}
                  changePct={
                    changeVsAverage === null
                      ? null
                      : Math.round(changeVsAverage * 10) / 10
                  }
                  size="lg"
                />
                {atLow && (
                  <Badge tone="good">Lowest in {RANGE_LABEL[range]}</Badge>
                )}
              </div>
              {detail.best_store && (
                <p className="text-[13px] capitalize text-ink-2">
                  Best price at {detail.best_store}
                </p>
              )}
            </div>
          </Card>

          <section aria-label="Price history" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold leading-[30px] text-ink">
                Price history
              </h2>
              <div
                role="tablist"
                aria-label="Range"
                className="flex gap-1 rounded-full bg-surface p-1 shadow-soft"
              >
                {RANGES.map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={r === range}
                    onClick={() => setRange(r)}
                    className={clsx(
                      "min-h-[40px] min-w-[48px] rounded-full px-4 text-[13px] font-bold transition-colors duration-150",
                      r === range
                        ? "bg-ink text-surface"
                        : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {history.isPending ? (
              <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-72 w-full !rounded-card" />
              </div>
            ) : history.isError ? (
              <ErrorState
                error={history.error}
                onRetry={() => history.refetch()}
              />
            ) : history.data.length === 0 ? (
              <EmptyState
                title="No price history yet"
                hint="The first check hasn't recorded a price. Check back soon."
              />
            ) : (
              <>
                <div
                  className={clsx(
                    "rounded-card px-5 py-4",
                    ADVICE_STYLE[advice.tone],
                  )}
                >
                  <p className="font-bold">{advice.headline}</p>
                  <p className="mt-0.5 text-[15px] opacity-90">
                    {advice.detail}
                  </p>
                </div>

                {stats && (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Lowest" value={formatINR(stats.lowest)} />
                    <StatCard
                      label="Average"
                      value={formatINR(Math.round(stats.average))}
                    />
                    <StatCard
                      label="Highest"
                      value={formatINR(stats.highest)}
                    />
                    <StatCard
                      label="Now vs average"
                      value={formatPct(
                        ((stats.current - stats.average) / stats.average) * 100,
                      )}
                      tone={stats.current <= stats.average ? "good" : "bad"}
                    />
                  </dl>
                )}

                <Card
                  className={clsx(
                    "!p-4",
                    history.isPlaceholderData && "opacity-60",
                  )}
                >
                  <PriceChart history={history.data} range={range} now={now} />
                </Card>
                {best.length < 2 && (
                  <p className="text-[13px] text-ink-2">
                    Only one price recorded so far, so the chart is flat.
                  </p>
                )}
              </>
            )}
          </section>

          <section aria-label="Prices by store" className="space-y-4">
            <h2 className="text-2xl font-extrabold leading-[30px] text-ink">
              Prices by store
            </h2>
            <StoreTable listings={detail.listings} productId={detail.id} />
          </section>
        </div>

        {isDesktop && (
          <aside aria-label="Price alert">
            <Card className="sticky top-8 space-y-4">
              <h2 className="text-lg font-extrabold text-ink">Price alert</h2>
              {panel}
            </Card>
          </aside>
        )}
      </div>

      {!isDesktop && (
        <>
          <div className="fixed inset-x-4 bottom-24 z-20">
            <Button
              className="w-full shadow-soft"
              onClick={() => setSheetOpen(true)}
            >
              <BellPlus size={20} strokeWidth={1.75} aria-hidden /> Set price
              alert
            </Button>
          </div>
          <Sheet open={sheetOpen} onClose={closeSheet} title="Price alert">
            {panel}
          </Sheet>
        </>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product">
      <Skeleton className="h-11 w-24" />
      <Skeleton className="h-64 w-full !rounded-card" />
      <Skeleton className="h-72 w-full !rounded-card" />
    </div>
  );
}
