import { Outlet } from "react-router-dom";

import { USE_MOCK } from "@/api/config";
import { useWorkspaces } from "@/api/hooks";
import { EmptyState, ErrorState } from "@/components/QueryState";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthed } from "@/hooks/useAuthed";
import type { MonitorsContext } from "@/hooks/useMonitorsContext";

/** Monitors live in the user's first workspace. Resolves it once and hands it to every monitor route. */
export function MonitorsGate() {
  const authed = useAuthed();
  const workspaces = useWorkspaces();

  if (USE_MOCK) {
    return (
      <EmptyState
        title="Monitors need the backend"
        hint="Demo data has no page monitors. Run the API to see them."
      />
    );
  }
  if (!authed) {
    return (
      <EmptyState
        title="Sign in to see your monitors"
        hint="Monitors belong to your workspace."
      >
        <ButtonLink to="/login?next=/prices/monitors">Sign in</ButtonLink>
      </EmptyState>
    );
  }
  if (workspaces.isError)
    return (
      <ErrorState
        error={workspaces.error}
        onRetry={() => workspaces.refetch()}
      />
    );
  if (workspaces.isPending)
    return <Skeleton className="h-40 w-full !rounded-card" />;

  const workspaceId = workspaces.data[0]?.id;
  if (!workspaceId) {
    return (
      <EmptyState
        title="No workspace found"
        hint="Create a workspace in ChangeRadar to start monitoring pages."
      />
    );
  }
  return <Outlet context={{ workspaceId } satisfies MonitorsContext} />;
}
