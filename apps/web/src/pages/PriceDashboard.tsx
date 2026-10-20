import { Link } from "react-router-dom";

import { useAlerts, useDeals, useSearch } from "@/api/priceHooks";
import { AlertRow } from "@/components/AlertRow";
import { DealCard, ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { Skeleton } from "@/components/Skeleton";
import { Welcome } from "@/components/Welcome";
import { useAuthed } from "@/hooks/useAuthed";
import { useWelcome } from "@/hooks/useWelcome";
import { useAuthStore } from "@/store/auth";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  products: icon("M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4"),
  alerts: icon("M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Zm4 10a2 2 0 0 0 4 0"),
  hit: icon("M5 12.5l4.5 4.5L19 7.5"),
  drop: icon("M3 7l6 6 4-4 8 8m0 0v-6m0 6h-6"),
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function PriceDashboard() {
  const authed = useAuthed();
  const user = useAuthStore((s) => s.user);
  const tracked = useSearch("");
  const deals = useDeals();
  const alerts = useAlerts(authed);
  const welcome = useWelcome();

  const alertList = alerts.data ?? [];
  const reached = alertList.filter((a) => a.triggered_at).length;
  const watching = alertList.length - reached;
  const bestDrop = deals.data?.reduce((max, d) => Math.max(max, d.drop_pct), 0) ?? 0;
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  if (welcome.show) return <Welcome onStart={welcome.dismiss} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {authed ? `${greeting()}${firstName ? `, ${firstName}` : ""}` : "Welcome to VilaiWatch"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Track prices across stores and buy at the right moment.</p>
        </div>
        <Link to="/prices/search" className="btn-primary">
          + Track a product
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Products tracked" value={tracked.data?.items.length} loading={tracked.isPending} icon={ICONS.products} />
        <StatTile
          label="Active alerts"
          value={authed ? watching : undefined}
          loading={authed && alerts.isPending}
          icon={ICONS.alerts}
          placeholder="Sign in"
        />
        <StatTile
          label="Targets reached"
          value={authed ? reached : undefined}
          loading={authed && alerts.isPending}
          icon={ICONS.hit}
          placeholder="Sign in"
        />
        <StatTile
          label="Biggest drop"
          value={bestDrop > 0 ? `−${bestDrop.toFixed(1)}%` : 0}
          loading={deals.isPending}
          icon={ICONS.drop}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">Biggest price drops</h2>
          <span className="text-xs text-slate-500">Cheapest in-stock price vs 30-day average</span>
        </div>
        {deals.isPending ? (
          <CardSkeletons />
        ) : deals.isError ? (
          <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
        ) : deals.data.length === 0 ? (
          <EmptyState title="No price drops right now" hint="Deals appear when a price falls below its recent average." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deals.data.slice(0, 6).map((deal) => (
              <DealCard key={deal.product_id} deal={deal} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">Your price alerts</h2>
            {authed && alertList.length > 0 && (
              <Link to="/prices/alerts" className="text-xs font-medium text-sky-600 hover:underline">
                View all
              </Link>
            )}
          </div>
          {!authed ? (
            <EmptyState title="Sign in to set price alerts" hint="Get notified the moment a price hits your target.">
              <Link to="/login?next=/prices" className="btn-primary">
                Sign in
              </Link>
            </EmptyState>
          ) : alerts.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : alerts.isError ? (
            <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
          ) : alertList.length === 0 ? (
            <EmptyState title="No alerts yet" hint="Open a product and set the price you want to pay.">
              <Link to="/prices/search" className="btn-primary">
                Find a product
              </Link>
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {alertList.slice(0, 4).map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">Tracked products</h2>
            <Link to="/prices/search" className="text-xs font-medium text-sky-600 hover:underline">
              Search all
            </Link>
          </div>
          {tracked.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : tracked.isError ? (
            <ErrorState error={tracked.error} onRetry={() => tracked.refetch()} />
          ) : tracked.data.items.length === 0 ? (
            <EmptyState title="Nothing is being tracked yet" hint="Paste a store link to start tracking its price.">
              <Link to="/prices/search" className="btn-primary">
                Track a product
              </Link>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {tracked.data.items.slice(0, 4).map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  loading,
  placeholder = "—",
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  loading: boolean;
  placeholder?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-white text-slate-400">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-10" />
        ) : value === undefined ? (
          <div className="text-sm text-slate-500">{placeholder}</div>
        ) : (
          <div className="text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
        )}
      </div>
    </div>
  );
}
