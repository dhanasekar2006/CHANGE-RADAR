import { Link } from "react-router-dom";

import { useChanges, useMonitors } from "@/api/hooks";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Skeleton } from "@/components/Skeleton";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { timeAgo } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import type { Monitor } from "@/types";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  monitors: icon("M3 12h4l3-8 4 16 3-8h4"),
  active: icon("M5 12.5l4.5 4.5L19 7.5"),
  paused: icon("M9 5v14M15 5v14"),
  errored: icon("M12 8v5m0 3.5v.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"),
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const workspaceId = useWorkspaceId();
  const user = useAuthStore((s) => s.user);
  const monitorsQuery = useMonitors(workspaceId);
  const changesQuery = useChanges(workspaceId);

  const monitors = monitorsQuery.data;
  const changes = changesQuery.data;
  const monitorsById = new Map((monitors ?? []).map((m) => [m.id, m]));

  const count = (status: Monitor["status"]) => monitors?.filter((m) => m.status === status).length ?? 0;
  const errored = count("error");
  const needsAttention = (monitors ?? []).filter((m) => m.status === "error");
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-400">Here's what's happening across your monitors.</p>
        </div>
        <Link to={`/w/${workspaceId}/monitors/new`} className="btn-primary">
          + New monitor
        </Link>
      </div>

      {monitorsQuery.isError ? (
        <ErrorState error={monitorsQuery.error} onRetry={() => monitorsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Monitors" value={monitors?.length} loading={monitorsQuery.isLoading} icon={ICONS.monitors} />
          <StatTile label="Active" value={count("active")} loading={monitorsQuery.isLoading} icon={ICONS.active} tone="good" />
          <StatTile label="Paused" value={count("paused")} loading={monitorsQuery.isLoading} icon={ICONS.paused} />
          <StatTile
            label="Errored"
            value={errored}
            loading={monitorsQuery.isLoading}
            icon={ICONS.errored}
            tone={errored > 0 ? "critical" : undefined}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent changes</h2>
            {changes && changes.total > 0 && <span className="text-xs text-slate-500">{changes.total} total</span>}
          </div>

          {changesQuery.isError ? (
            <ErrorState error={changesQuery.error} onRetry={() => changesQuery.refetch()} />
          ) : changesQuery.isLoading ? (
            <div className="card space-y-px overflow-hidden">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-none" />
              ))}
            </div>
          ) : changes?.items.length ? (
            <div className="card divide-y divide-slate-800 overflow-hidden">
              {changes.items.map((change) => (
                <Link
                  key={change.id}
                  to={`/w/${workspaceId}/changes/${change.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-slate-800/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-100">
                      {monitorsById.get(change.monitor_id)?.name ?? "Monitor"}
                    </span>
                    <span className="block truncate text-sm text-slate-400">
                      {change.ai_summary ?? change.diff_summary ?? "Content changed"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <ScoreBadge significance={change.significance} />
                    <span className="text-xs text-slate-500">{timeAgo(change.created_at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No changes detected yet" hint="Changes show up here once a monitor sees a page update.">
              {monitors?.length === 0 && (
                <Link to={`/w/${workspaceId}/monitors/new`} className="btn-primary">
                  Add your first monitor
                </Link>
              )}
            </EmptyState>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Needs attention</h2>
          <div className="card divide-y divide-slate-800 overflow-hidden">
            {needsAttention.length ? (
              needsAttention.map((monitor) => (
                <Link
                  key={monitor.id}
                  to={`/w/${workspaceId}/monitors/${monitor.id}`}
                  className="block px-4 py-3 transition hover:bg-slate-800/40"
                >
                  <span className="block truncate text-sm font-medium">{monitor.name}</span>
                  <span className="block truncate text-xs text-slate-500">{monitor.url}</span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {monitorsQuery.isLoading ? "Loading…" : "All monitors are healthy."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const TONES = {
  good: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  critical: "bg-red-500/10 text-significance-critical ring-red-400/20",
  default: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
};

function StatTile({
  label,
  value,
  icon,
  loading,
  tone,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
  tone?: "good" | "critical";
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONES[tone ?? "default"]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-400">{label}</div>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-10" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value ?? 0}</div>
        )}
      </div>
    </div>
  );
}
