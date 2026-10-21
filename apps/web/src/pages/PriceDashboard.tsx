import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAlerts, useDeals, useSearch } from "@/api/priceHooks";
import { AlertRow } from "@/components/AlertRow";
import { DealCard, ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { SearchField } from "@/components/SearchField";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Welcome } from "@/components/Welcome";
import { useAuthed } from "@/hooks/useAuthed";
import { useWelcome } from "@/hooks/useWelcome";
import { useAuthStore } from "@/store/auth";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-2xl font-extrabold leading-[30px] text-ink">{title}</h2>
      {to && (
        <Link to={to} className="text-[13px] font-bold text-accent-strong hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function PriceDashboard() {
  const navigate = useNavigate();
  const authed = useAuthed();
  const user = useAuthStore((s) => s.user);
  const tracked = useSearch("");
  const deals = useDeals();
  const alerts = useAlerts(authed);
  const welcome = useWelcome();
  const [text, setText] = useState("");

  const alertList = alerts.data ?? [];
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  if (welcome.show) return <Welcome onStart={welcome.dismiss} />;

  const search = () => navigate(`/prices/search${text.trim() ? `?q=${encodeURIComponent(text.trim())}` : ""}`);

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
            {authed ? `${greeting()}${firstName ? `, ${firstName}` : ""}` : "Welcome to VilaiWatch"}
          </h1>
          <p className="mt-1 text-[15px] text-ink-2">Track prices across stores and buy at the right moment.</p>
        </div>
        <SearchField value={text} onChange={setText} onSubmit={search} />
      </header>

      <section className="space-y-4">
        <SectionHeader title="Biggest price drops today" />
        {deals.isPending ? (
          <div className="flex gap-4 overflow-hidden" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-64 shrink-0 !rounded-card" />
            ))}
          </div>
        ) : deals.isError ? (
          <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
        ) : deals.data.length === 0 ? (
          <EmptyState title="No price drops right now" hint="Deals appear when a price falls below its recent average." />
        ) : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {deals.data.slice(0, 8).map((deal) => (
              <DealCard key={deal.product_id} deal={deal} />
            ))}
          </div>
        )}
        <p className="text-[13px] text-ink-2">Cheapest in-stock price versus its 30-day average.</p>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section className="space-y-4">
          <SectionHeader title="Your watchlist" to="/prices/search" linkLabel="Search all" />
          {tracked.isPending ? (
            <Skeleton className="h-24 w-full !rounded-card" />
          ) : tracked.isError ? (
            <ErrorState error={tracked.error} onRetry={() => tracked.refetch()} />
          ) : tracked.data.items.length === 0 ? (
            <EmptyState title="Nothing is being tracked yet" hint="Paste a store link to start tracking its price.">
              <ButtonLink to="/prices/search">Track a product</ButtonLink>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {tracked.data.items.slice(0, 4).map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Recent alerts"
            to={authed && alertList.length > 0 ? "/prices/alerts" : undefined}
            linkLabel="View all"
          />
          {!authed ? (
            <EmptyState title="Sign in to set price alerts" hint="Get notified the moment a price hits your target.">
              <ButtonLink to="/login?next=/prices">Sign in</ButtonLink>
            </EmptyState>
          ) : alerts.isPending ? (
            <Skeleton className="h-24 w-full !rounded-card" />
          ) : alerts.isError ? (
            <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
          ) : alertList.length === 0 ? (
            <EmptyState title="No alerts yet" hint="Open a product and set the price you want to pay.">
              <ButtonLink to="/prices/search">Find a product</ButtonLink>
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {alertList.slice(0, 4).map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
