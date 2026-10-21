import { Play } from "lucide-react";

import { USE_MOCK } from "@/api/config";
import { useChanges, useMonitors, useRunMonitorNow, useWorkspaces } from "@/api/hooks";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";
import { timeAgo } from "@/lib/format";
import type { ChangeSignificance, MonitorStatus } from "@/types";

const STATUS_TONE = { active: "good", paused: "neutral", error: "warn" } as const satisfies Record<MonitorStatus, string>;
const STATUS_LABEL: Record<MonitorStatus, string> = { active: "Active", paused: "Paused", error: "Error" };

const SIGNIFICANCE_TONE = {
  noise: "neutral",
  minor: "neutral",
  moderate: "accent",
  major: "warn",
  critical: "warn",
} as const satisfies Record<ChangeSignificance, string>;

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full !rounded-card" />
      ))}
    </div>
  );
}

/** ChangeRadar monitors and the change feed, for the first workspace the signed-in user belongs to. */
export function Monitors() {
  const authed = useAuthed();
  const workspaces = useWorkspaces();
  const workspaceId = workspaces.data?.[0]?.id;
  const monitors = useMonitors(workspaceId);
  const changes = useChanges(workspaceId);
  const runNow = useRunMonitorNow(workspaceId);

  if (USE_MOCK) {
    return <EmptyState title="Monitors need the backend" hint="Demo data has no page monitors. Run the API to see them." />;
  }

  if (!authed) {
    return (
      <EmptyState title="Sign in to see your monitors" hint="Monitors belong to your workspace.">
        <ButtonLink to="/login?next=/prices/monitors">Sign in</ButtonLink>
      </EmptyState>
    );
  }

  const monitorList = monitors.data ?? [];
  const monitorsById = new Map(monitorList.map((m) => [m.id, m]));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">Monitors</h1>
        <p className="mt-1 text-[15px] text-ink-2">Pages you watch for changes, and what changed.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-[30px] text-ink">Watching</h2>
        {workspaces.isError ? (
          <ErrorState error={workspaces.error} onRetry={() => workspaces.refetch()} />
        ) : monitors.isError ? (
          <ErrorState error={monitors.error} onRetry={() => monitors.refetch()} />
        ) : workspaces.isPending || monitors.isPending ? (
          workspaces.isSuccess && !workspaceId ? null : <ListSkeleton />
        ) : monitorList.length === 0 ? (
          <EmptyState title="No monitors yet" hint="Monitors you add show up here with their latest status." />
        ) : (
          <ul className="space-y-3">
            {monitorList.map((monitor) => (
              <li key={monitor.id}>
                <Card className="flex items-center justify-between gap-4 !p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[15px] font-bold text-ink">{monitor.name}</p>
                    <p className="truncate text-[13px] text-ink-2">{monitor.url}</p>
                    <p className="text-xs text-ink-2">
                      <UpdatedAgo checkedAt={monitor.last_checked_at} prefix="Checked" />
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={STATUS_TONE[monitor.status]}>{STATUS_LABEL[monitor.status]}</Badge>
                    <Button
                      variant="secondary"
                      onClick={() => runNow.mutate(monitor.id)}
                      disabled={runNow.isPending}
                      aria-label={`Run ${monitor.name} now`}
                    >
                      <Play size={16} strokeWidth={1.75} aria-hidden />
                      Run now
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {workspaces.isSuccess && !workspaceId && (
          <EmptyState title="No workspace found" hint="Create a workspace in ChangeRadar to start monitoring pages." />
        )}
      </section>

      {workspaceId && (
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold leading-[30px] text-ink">Recent changes</h2>
          {changes.isError ? (
            <ErrorState error={changes.error} onRetry={() => changes.refetch()} />
          ) : changes.isPending ? (
            <ListSkeleton />
          ) : changes.data.items.length === 0 ? (
            <EmptyState title="No changes detected yet" hint="Changes appear here once a monitored page updates." />
          ) : (
            <ul className="space-y-3">
              {changes.data.items.map((change) => (
                <li key={change.id}>
                  <Card className="flex items-center justify-between gap-4 !p-5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-ink">{monitorsById.get(change.monitor_id)?.name ?? "Monitor"}</p>
                      <p className="line-clamp-2 text-[13px] text-ink-2">{change.ai_summary ?? change.diff_summary ?? "Content changed"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={SIGNIFICANCE_TONE[change.significance]}>{change.significance}</Badge>
                      <span className="text-xs text-ink-2">{timeAgo(change.created_at)}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
