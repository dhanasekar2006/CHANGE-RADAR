import { USE_MOCK } from "@/api/config";
import { useAuthStore } from "@/store/auth";

/** Alerts need a signed-in user; the mock layer has no auth, so it counts as signed in. */
export function useAuthed(): boolean {
  const token = useAuthStore((s) => s.accessToken);
  return USE_MOCK || Boolean(token);
}
