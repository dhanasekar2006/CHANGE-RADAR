import {
  ArrowLeft,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  useChanges,
  useDeleteMonitor,
  useMonitor,
  useRunMonitorNow,
  useSetMonitorPaused,
} from "@/api/hooks";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { SignificanceBadge } from "@/components/ui/SignificanceBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMonitorsContext } from "@/hooks/useMonitorsContext";
import { timeAgo } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/monitorStatus";

const FETCHER_LABEL = {
  http: "HTTP",
  browser: "Browser",
  feed: "Feed",
} as const;
const EXTRACTOR_LABEL = {
  css: "CSS selector",
  xpath: "XPath",
  jsonpath: "JSONPath",
  readability: "Readability",
} as const;

function formatInterval(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Every ${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `Every ${hours} h` : `Every ${minutes} min`;
}

export function MonitorDetail() {
  const { workspaceId } = useMonitorsContext();
  const { monitorId } = useParams<{ monitorId: string }>();
  const navigate = useNavigate();
  const monitor = useMonitor(workspaceId, monitorId);
  const changes = useChanges(workspaceId, monitorId);
  const runNow = useRunMonitorNow(workspaceId);
  const setPaused = useSetMonitorPaused(workspaceId);
  const remove = useDeleteMonitor(workspaceId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const back = (
    <Link
      to="/prices/monitors"
      className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-bold text-accent-strong hover:underline"
    >
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden /> Monitors
    </Link>
  );

  if (monitor.isError) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={monitor.error} onRetry={() => monitor.refetch()} />
      </div>
    );
  }
  if (monitor.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        {back}
        <Skeleton className="h-40 w-full !rounded-card" />
        <Skeleton className="h-48 w-full !rounded-card" />
      </div>
    );
  }

  const m = monitor.data;
  const isPaused = m.status === "paused";
  const mutationError = runNow.error ?? setPaused.error ?? remove.error;

  function handleDelete() {
    remove.mutate(m.id, {
      onSuccess: () => navigate("/prices/monitors", { replace: true }),
    });
  }

  return (
    <div className="space-y-8">
      {back}

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
                {m.name}
              </h1>
              <Badge tone={STATUS_TONE[m.status]}>
                {STATUS_LABEL[m.status]}
              </Badge>
            </div>
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-[13px] text-accent-strong hover:underline"
            >
              <span className="truncate">{m.url}</span>
              <ExternalLink
                size={14}
                strokeWidth={1.75}
                aria-hidden
                className="shrink-0"
              />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => runNow.mutate(m.id)}
            disabled={runNow.isPending}
          >
            <Play size={16} strokeWidth={1.75} aria-hidden />
            Run now
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              setPaused.mutate({ monitorId: m.id, paused: !isPaused })
            }
            disabled={setPaused.isPending}
          >
            {isPaused ? (
              <Play size={16} strokeWidth={1.75} aria-hidden />
            ) : (
              <Pause size={16} strokeWidth={1.75} aria-hidden />
            )}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <ButtonLink to={`/prices/monitors/${m.id}/edit`} variant="secondary">
            <Pencil size={16} strokeWidth={1.75} aria-hidden />
            Edit
          </ButtonLink>
          <Button
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${m.name}`}
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden />
            Delete
          </Button>
        </div>

        {confirmingDelete && (
          <div
            role="alertdialog"
            aria-label="Confirm delete"
            className="flex flex-wrap items-center gap-3 rounded-row bg-warn-soft p-4"
          >
            <p className="flex-1 text-[15px] font-semibold text-warn">
              Delete this monitor and its change history?
            </p>
            <Button
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep it
            </Button>
            <Button onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete monitor"}
            </Button>
          </div>
        )}

        {mutationError && (
          <p role="alert" className="text-[13px] font-semibold text-warn">
            {mutationError.message}
          </p>
        )}
      </Card>

      <Card className="!p-3">
        <ListRow
          label="Last checked"
          value={<UpdatedAgo checkedAt={m.last_checked_at} prefix="" />}
        />
        <ListRow
          label="Check interval"
          value={formatInterval(m.check_interval_seconds)}
        />
        <ListRow label="Fetcher" value={FETCHER_LABEL[m.fetcher_type]} />
        <ListRow label="Extractor" value={EXTRACTOR_LABEL[m.extractor_type]} />
        {m.selector && (
          <ListRow
            label="Selector"
            value={<code className="text-[13px]">{m.selector}</code>}
          />
        )}
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-[30px] text-ink">
          Change history
        </h2>
        {changes.isError ? (
          <ErrorState error={changes.error} onRetry={() => changes.refetch()} />
        ) : changes.isPending ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full !rounded-card" />
            ))}
          </div>
        ) : changes.data.items.length === 0 ? (
          <EmptyState
            title="No changes yet"
            hint="We will list every change here once this page updates."
          >
            <Button
              variant="secondary"
              onClick={() => runNow.mutate(m.id)}
              disabled={runNow.isPending}
            >
              Check now
            </Button>
          </EmptyState>
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
                      <p className="line-clamp-2 text-[15px] font-bold text-ink">
                        {change.ai_summary ??
                          change.diff_summary ??
                          "Content changed"}
                      </p>
                      <p className="text-xs text-ink-2">
                        {timeAgo(change.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SignificanceBadge significance={change.significance} />
                      {!change.acknowledged && <Badge tone="dark">New</Badge>}
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
