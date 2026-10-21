import type { ReactNode } from "react";

export const inputClass =
  "h-12 w-full rounded-row border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent";

/** A labelled form control: the label wraps the input, so it is always its accessible name. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-2">{hint}</span>}
    </label>
  );
}
