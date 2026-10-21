import { Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { useChanges, useMonitors, useRunMonitorNow } from "@/api/hooks";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SignificanceBadge } from "@/components/ui/SignificanceBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMonitorsContext } from "@/hooks/useMonitorsContext";
import { timeAgo } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/monitorStatus";

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full !rounded-card" />
      ))}
    </div>
  );
}

/** ChangeRadar monitors and the change feed for the active workspace. */
export function Monitors() {
  const { workspaceId } = useMonitorsContext();
  const monitors = useMonitors(workspaceId);
  const changes = useChanges(workspaceId);
  const runNow = useRunMonitorNow(workspaceId);

  const monitorList = monitors.data ?? [];
  const monitorsById = new Map(monitorList.map((m) => [m.id, m]));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
            Monitors
          </h1>
          <p className="mt-1 text-[15px] text-ink-2">
            Pages you watch for changes, and what changed.
          </p>
        </div>
        <ButtonLink to="/prices/monitors/new">
          <Plus size={18} strokeWidth={1.75} aria-hidden />
          New monitor
        </ButtonLink>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-[30px] text-ink">
          Watching
        </h2>
        {monitors.isError ? (
          <ErrorState
            error={monitors.error}
            onRetry={() => monitors.refetch()}
          />
        ) : monitors.isPending ? (
          <ListSkeleton />
        ) : monitorList.length === 0 ? (
          <EmptyState
            title="No monitors yet"
            hint="Add a page and we will tell you when it changes."
          >
            <ButtonLink to="/prices/monitors/new">
              Add your first monitor
            </ButtonLink>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {monitorList.map((monitor) => (
              <li key={monitor.id}>
                <Card className="flex items-center justify-between gap-4 !p-5">
                  <Link
                    to={`/prices/monitors/${monitor.id}`}
                    className="min-w-0 flex-1 space-y-1 rounded-row"
                  >
                    <p className="truncate text-[15px] font-bold text-ink">
                      {monitor.name}
                    </p>
                    <p className="truncate text-[13px] text-ink-2">
                      {monitor.url}
                    </p>
                    <p className="text-xs text-ink-2">
                      <UpdatedAgo
                        checkedAt={monitor.last_checked_at}
                        prefix="Checked"
                      />
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={STATUS_TONE[monitor.status]}>
                      {STATUS_LABEL[monitor.status]}
                    </Badge>
                    <Button
                      variant="secondary"
                      onClick={() => runNow.mutate(monitor.id)}
                      disabled={runNow.isPending}
                      aria-label={`Run ${monitor.name} now`}
                    >
                      <Play size={16} strokeWidth={1.75} aria-hidden />
                      <span className="hidden sm:inline">Run now</span>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-[30px] text-ink">
          Recent changes
        </h2>
        {changes.isError ? (
          <ErrorState error={changes.error} onRetry={() => changes.refetch()} />
        ) : changes.isPending ? (
          <ListSkeleton />
        ) : changes.data.items.length === 0 ? (
          <EmptyState
            title="No changes detected yet"
            hint="Changes appear here once a monitored page updates."
          />
        ) : (
          <ul className="space-y-3">
            {changes.data.items.map((change) => (
              <li key={change.id}>
                <Link
                  to={`/prices/changes/${change.id}`}
                  className="block rounded-card transition-shadow duration-150 hover:shadow-md"
                >
                  <Card className="flex items-center justify-between gap-4 !p-5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-ink">
                        {monitorsById.get(change.monitor_id)?.name ?? "Monitor"}
                      </p>
                      <p className="line-clamp-2 text-[13px] text-ink-2">
                        {change.ai_summary ??
                          change.diff_summary ??
                          "Content changed"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SignificanceBadge significance={change.significance} />
                      <span className="text-xs text-ink-2">
                        {timeAgo(change.created_at)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
