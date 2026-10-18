import { Link } from "react-router-dom";

import { useMonitors, useRunMonitorNow } from "@/api/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import type { MonitorStatus } from "@/types";

const STATUS_COLOR: Record<MonitorStatus, string> = {
  active: "text-emerald-400",
  paused: "text-slate-500",
  error: "text-red-400",
};

export function MonitorList() {
  const workspaceId = useWorkspaceId();
  const { data: monitors, isLoading } = useMonitors(workspaceId);
  const runNow = useRunMonitorNow(workspaceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Watching</p>
          <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
        </div>
        <Link
          to={`/w/${workspaceId}/monitors/new`}
          className="btn-primary"
        >
          New monitor
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="card divide-y divide-slate-800 overflow-hidden">
        {monitors?.map((monitor) => (
          <div key={monitor.id} className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-800/40">
            <Link to={`/w/${workspaceId}/monitors/${monitor.id}`} className="min-w-0">
              <div className="truncate font-medium">{monitor.name}</div>
              <div className="truncate text-xs text-slate-500">{monitor.url}</div>
            </Link>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-medium ${STATUS_COLOR[monitor.status]}`}>{monitor.status}</span>
              <button
                onClick={() => runNow.mutate(monitor.id)}
                disabled={runNow.isPending}
                className="btn-ghost !px-2.5 !py-1 !text-xs"
              >
                Run now
              </button>
            </div>
          </div>
        ))}
        {monitors?.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">No monitors yet.</div>
        )}
      </div>
    </div>
  );
}
