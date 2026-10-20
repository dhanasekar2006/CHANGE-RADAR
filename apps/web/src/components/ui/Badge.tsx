import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "dark" | "good" | "warn" | "accent" | "neutral";

const tones: Record<Tone, string> = {
  dark: "bg-ink text-surface",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent-strong",
  neutral: "bg-surface-2 text-ink-2",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>
      {children}
    </span>
  );
}
