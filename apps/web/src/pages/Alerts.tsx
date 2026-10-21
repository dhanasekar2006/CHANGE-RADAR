import clsx from "clsx";
import { useState } from "react";

import { useAlerts } from "@/api/priceHooks";
import { AlertRow } from "@/components/AlertRow";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";
import { isReached } from "@/lib/alertStatus";
import { useAuthStore } from "@/store/auth";

type Filter = "all" | "reached" | "watching";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reached", label: "Target reached" },
  { id: "watching", label: "Watching" },
];

function ProfileCard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const name = user.full_name ?? user.email;
  return (
    <Card className="flex items-center gap-4 !p-5">
      <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-lg font-extrabold text-accent-strong">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-ink">{name}</p>
        {user.full_name && <p className="truncate text-[13px] text-ink-2">{user.email}</p>}
      </div>
    </Card>
  );
}

export function Alerts() {
  const authed = useAuthed();
  const alerts = useAlerts(authed);
  const [filter, setFilter] = useState<Filter>("all");

  if (!authed) {
    return (
      <EmptyState title="Sign in to see your price alerts" hint="Alerts are tied to your account.">
        <ButtonLink to="/login?next=/prices/alerts">Sign in</ButtonLink>
      </EmptyState>
    );
  }

  const all = alerts.data ?? [];
  const visible = all.filter((a) => filter === "all" || (filter === "reached") === isReached(a));

  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">Price alerts</h1>
      <ProfileCard />

      {alerts.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full !rounded-card" />
          ))}
        </div>
      ) : alerts.isError ? (
        <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState title="No alerts yet" hint="Open a product and set the price you want to pay.">
          <ButtonLink to="/prices/search">Find a product</ButtonLink>
        </EmptyState>
      ) : (
        <>
          <div role="group" aria-label="Filter alerts" className="flex flex-wrap gap-2">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={clsx(
                  "min-h-[44px] rounded-full px-5 text-sm font-semibold transition-colors duration-150",
                  filter === id ? "bg-ink text-surface" : "bg-surface text-ink-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <EmptyState title="No alerts match this filter" />
          ) : (
            <ul className="space-y-3">
              {visible.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
