import { useParams } from "react-router-dom";

import { useAcknowledgeChange, useChange } from "@/api/hooks";
import { DiffBlock } from "@/components/DiffBlock";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

export function DiffViewer() {
  const workspaceId = useWorkspaceId();
  const { changeId } = useParams<{ changeId: string }>();
  const { data: change } = useChange(workspaceId, changeId);
  const acknowledge = useAcknowledgeChange(workspaceId);

  if (!change) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Change detail</h1>
          <ScoreBadge significance={change.significance} />
        </div>
        {!change.acknowledged && (
          <button
            onClick={() => acknowledge.mutate(change.id)}
            disabled={acknowledge.isPending}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Acknowledge
          </button>
        )}
      </div>

      {change.ai_summary && <p className="text-sm text-slate-300">{change.ai_summary}</p>}

      <div className="text-xs text-slate-500">
        {change.diff_summary} · similarity {change.similarity_score?.toFixed(3) ?? "n/a"}
      </div>

      <DiffBlock diffText={change.diff_payload} />
    </div>
  );
}
