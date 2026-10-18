import { Link, useParams } from "react-router-dom";

import { useChanges, useMonitor } from "@/api/hooks";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

export function MonitorDetail() {
  const workspaceId = useWorkspaceId();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { data: monitor } = useMonitor(workspaceId, monitorId);
  const { data: changes } = useChanges(workspaceId, monitorId);

  if (!monitor) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{monitor.name}</h1>
        <a href={monitor.url} target="_blank" rel="noreferrer" className="text-sm text-sky-400 hover:underline">
          {monitor.url}
        </a>
      </div>

      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="mt-1">{monitor.status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last checked</dt>
          <dd className="mt-1">{monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleString() : "never"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Interval</dt>
          <dd className="mt-1">{Math.round(monitor.check_interval_seconds / 60)} min</dd>
        </div>
      </dl>

      <section>
        <h2 className="mb-3 text-lg font-medium">Change history</h2>
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {changes?.items.map((change) => (
            <Link
              key={change.id}
              to={`/w/${workspaceId}/changes/${change.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/50"
            >
              <div>
                <div className="text-sm text-slate-300">{change.diff_summary ?? "content changed"}</div>
                <div className="text-xs text-slate-500">{new Date(change.created_at).toLocaleString()}</div>
              </div>
              <ScoreBadge significance={change.significance} />
            </Link>
          ))}
          {changes?.items.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No changes recorded yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
