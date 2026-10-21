import { ArrowLeft, Check } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAcknowledgeChange, useChange, useMonitor } from "@/api/hooks";
import { DiffBlock } from "@/components/DiffBlock";
import { ErrorState } from "@/components/QueryState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SignificanceBadge } from "@/components/ui/SignificanceBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMonitorsContext } from "@/hooks/useMonitorsContext";
import { timeAgo } from "@/lib/format";

export function DiffViewer() {
  const { workspaceId } = useMonitorsContext();
  const { changeId } = useParams<{ changeId: string }>();
  const change = useChange(workspaceId, changeId);
  const monitor = useMonitor(workspaceId, change.data?.monitor_id);
  const acknowledge = useAcknowledgeChange(workspaceId);

  const backTo = change.data
    ? `/prices/monitors/${change.data.monitor_id}`
    : "/prices/monitors";
  const back = (
    <Link
      to={backTo}
      className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-bold text-accent-strong hover:underline"
    >
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />{" "}
      {monitor.data?.name ?? "Monitors"}
    </Link>
  );

  if (change.isError) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={change.error} onRetry={() => change.refetch()} />
      </div>
    );
  }
  if (change.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        {back}
        <Skeleton className="h-28 w-full !rounded-card" />
        <Skeleton className="h-64 w-full !rounded-card" />
      </div>
    );
  }

  const c = change.data;
  return (
    <div className="space-y-6">
      {back}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
              Change detail
            </h1>
            <SignificanceBadge significance={c.significance} />
          </div>
          <p className="text-[13px] text-ink-2">
            Detected {timeAgo(c.created_at)}
            {c.similarity_score !== null &&
              ` · ${(c.similarity_score * 100).toFixed(1)}% similar to before`}
          </p>
        </div>
        {c.acknowledged ? (
          <Badge tone="good">
            <Check size={14} strokeWidth={1.75} aria-hidden />
            Acknowledged
          </Badge>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => acknowledge.mutate(c.id)}
              disabled={acknowledge.isPending}
            >
              <Check size={16} strokeWidth={1.75} aria-hidden />
              Acknowledge
            </Button>
            {acknowledge.isError && (
              <p role="alert" className="text-[13px] font-semibold text-warn">
                {acknowledge.error.message}
              </p>
            )}
          </div>
        )}
      </header>

      {(c.ai_summary || c.diff_summary) && (
        <Card className="space-y-1 !p-5">
          <p className="text-[15px] font-bold text-ink">
            {c.ai_summary ?? c.diff_summary}
          </p>
          {c.ai_summary && c.diff_summary && (
            <p className="text-[13px] text-ink-2">{c.diff_summary}</p>
          )}
        </Card>
      )}

      {c.diff_payload.trim() === "" ? (
        <Card className="!p-5 text-[15px] text-ink-2">
          This change has no text diff to show.
        </Card>
      ) : (
        <DiffBlock diffText={c.diff_payload} />
      )}
    </div>
  );
}
