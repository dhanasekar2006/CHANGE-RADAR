import type { ChangeSignificance } from "@/types";

const LABELS: Record<ChangeSignificance, string> = {
  noise: "Noise",
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  critical: "Critical",
};

const COLORS: Record<ChangeSignificance, string> = {
  noise: "bg-significance-noise/20 text-significance-noise",
  minor: "bg-significance-minor/20 text-significance-minor",
  moderate: "bg-significance-moderate/20 text-significance-moderate",
  major: "bg-significance-major/20 text-significance-major",
  critical: "bg-significance-critical/20 text-significance-critical",
};

export function ScoreBadge({ significance }: { significance: ChangeSignificance }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[significance]}`}>
      {LABELS[significance]}
    </span>
  );
}
