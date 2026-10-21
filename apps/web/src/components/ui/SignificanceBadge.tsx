import { Badge } from "@/components/ui/Badge";
import type { ChangeSignificance } from "@/types";

const TONE = {
  noise: "neutral",
  minor: "neutral",
  moderate: "accent",
  major: "warn",
  critical: "warn",
} as const satisfies Record<ChangeSignificance, string>;

const LABEL: Record<ChangeSignificance, string> = {
  noise: "Noise",
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  critical: "Critical",
};

export function SignificanceBadge({ significance }: { significance: ChangeSignificance }) {
  return <Badge tone={TONE[significance]}>{LABEL[significance]}</Badge>;
}
