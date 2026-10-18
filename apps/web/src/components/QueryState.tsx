import { ApiError } from "@/api/client";

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and that the API is running.";
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
      <p className="font-medium text-red-800">Couldn't load this</p>
      <p className="mt-1 text-red-700">{describe(error)}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-white px-4 py-10 text-center">
      <p className="font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
