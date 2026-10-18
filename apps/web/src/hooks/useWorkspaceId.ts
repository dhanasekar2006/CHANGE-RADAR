import { useParams } from "react-router-dom";

/** Reads the active workspace id out of the URL (`/w/:workspaceId/...`). */
export function useWorkspaceId(): string | undefined {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return workspaceId;
}
