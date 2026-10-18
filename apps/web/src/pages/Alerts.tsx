import { Link } from "react-router-dom";

import { useAlerts } from "@/api/priceHooks";
import { AlertRow } from "@/components/AlertRow";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { Skeleton } from "@/components/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";

export function Alerts() {
  const authed = useAuthed();
  const alerts = useAlerts(authed);

  if (!authed) {
    return (
      <EmptyState
        title="Sign in to see your price alerts"
        hint="Alerts are tied to your account."
      >
        <Link
          to="/login?next=/prices/alerts"
          className="text-sm text-sky-400 hover:underline"
        >
          Sign in
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Price alerts</h1>

      {alerts.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : alerts.isError ? (
        <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
      ) : alerts.data.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          hint="Open a product and set the price you want to pay."
        >
          <Link to="/prices/search" className="text-sm text-sky-400 hover:underline">
            Find a product
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {alerts.data.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </ul>
      )}
    </div>
  );
}
