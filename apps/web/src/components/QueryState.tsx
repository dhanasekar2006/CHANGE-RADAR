import { ApiError } from "@/api/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState as ErrorCard } from "@/components/ui/ErrorState";

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and that the API is running.";
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <ErrorCard message={describe(error)} onRetry={onRetry} />;
}

export { EmptyState };
