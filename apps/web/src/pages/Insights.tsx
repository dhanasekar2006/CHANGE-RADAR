import { useQueries } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Link } from "react-router-dom";

import { pricesApi } from "@/api/prices";
import { useSearch } from "@/api/priceHooks";
import { priceKeys, REFETCH } from "@/api/priceKeys";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { buildInsights, type Insight, type InsightTone } from "@/lib/insights";

const MAX_PRODUCTS = 8;

const TONE_STYLE: Record<InsightTone, { icon: typeof Minus; chip: string }> = {
  good: { icon: ArrowDownRight, chip: "bg-good-soft text-good" },
  warn: { icon: ArrowUpRight, chip: "bg-warn-soft text-warn" },
  neutral: { icon: Minus, chip: "bg-surface-2 text-ink-2" },
};

function InsightCard({ insight }: { insight: Insight }) {
  const { icon: Icon, chip } = TONE_STYLE[insight.tone];
  return (
    <li>
      <Link to={`/prices/p/${insight.productId}`} className="block rounded-card transition-shadow duration-150 hover:shadow-md">
        <Card className="flex items-center gap-4 !p-5">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${chip}`}>
            <Icon size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">{insight.text}</p>
            <p className="truncate text-[13px] text-ink-2">{insight.productName}</p>
          </div>
        </Card>
      </Link>
    </li>
  );
}

/** Plain-language facts computed client-side from each tracked product's 3-month price history. */
export function Insights() {
  const tracked = useSearch("");
  const items = (tracked.data?.items ?? []).slice(0, MAX_PRODUCTS);

  const histories = useQueries({
    queries: items.map((item) => ({
      queryKey: priceKeys.history(item.id, "3M"),
      queryFn: () => pricesApi.history(item.id, "3M"),
      refetchInterval: REFETCH.history,
    })),
  });

  const loading = tracked.isPending || histories.some((h) => h.isPending);
  const failed = histories.find((h) => h.isError);
  const now = Date.now();
  const insights = items.flatMap((item, i) => buildInsights(item.id, item.name, histories[i]?.data ?? [], now));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">Insights</h1>
        <p className="mt-1 text-[15px] text-ink-2">What changed across the products you track, from their price history.</p>
      </header>

      {tracked.isError ? (
        <ErrorState error={tracked.error} onRetry={() => tracked.refetch()} />
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full !rounded-card" />
          ))}
        </div>
      ) : failed ? (
        <ErrorState error={failed.error} onRetry={() => histories.forEach((h) => void h.refetch())} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing to report yet" hint="Track a product and its price insights will show up here.">
          <Link to="/prices/search" className="font-bold text-accent-strong hover:underline">
            Track a product
          </Link>
        </EmptyState>
      ) : insights.length === 0 ? (
        <EmptyState title="No notable changes" hint="Insights appear once a product has at least a week of price history." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2" aria-live="polite">
          {insights.map((insight) => (
            <InsightCard key={`${insight.productId}-${insight.text}`} insight={insight} />
          ))}
        </ul>
      )}
    </div>
  );
}
