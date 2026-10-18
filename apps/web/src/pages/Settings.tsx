import { useWorkspaces } from "@/api/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

export function Settings() {
  const workspaceId = useWorkspaceId();
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.id === workspaceId);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-lg border border-slate-800 p-4">
        <div className="text-sm text-slate-500">Workspace name</div>
        <div className="mt-1 text-lg">{workspace?.name ?? "…"}</div>
      </div>

      <div className="rounded-lg border border-slate-800 p-4">
        <div className="text-sm text-slate-500">Workspace slug</div>
        <div className="mt-1 font-mono text-sm">{workspace?.slug ?? "…"}</div>
      </div>
    </div>
  );
}
