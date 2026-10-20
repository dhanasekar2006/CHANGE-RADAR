import type { ReactNode } from "react";

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-5 py-10 text-center">
      <p className="text-lg font-bold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-2">{hint}</p>}
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}
