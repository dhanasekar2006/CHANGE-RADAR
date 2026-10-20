import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";

import { formatINR } from "@/lib/format";

interface PriceTagProps {
  price: number | null;
  oldPrice?: number | null;
  /** Percent change; negative = price dropped. */
  changePct?: number | null;
  size?: "md" | "lg";
}

export function PriceTag({ price, oldPrice, changePct, size = "md" }: PriceTagProps) {
  const dropped = changePct != null && changePct < 0;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={clsx("font-extrabold tabular-nums text-ink", size === "lg" ? "text-[32px] leading-[38px]" : "text-lg")}>
        {formatINR(price)}
      </span>
      {oldPrice != null && oldPrice !== price && (
        <span className="text-[13px] tabular-nums text-ink-3 line-through">{formatINR(oldPrice)}</span>
      )}
      {changePct != null && changePct !== 0 && (
        <span
          className={clsx(
            "inline-flex items-center gap-0.5 text-[13px] font-bold tabular-nums",
            dropped ? "text-good" : "text-warn",
          )}
        >
          {dropped ? <ArrowDown size={14} strokeWidth={2} aria-hidden /> : <ArrowUp size={14} strokeWidth={2} aria-hidden />}
          {Math.abs(changePct).toFixed(1)}%<span className="sr-only">{dropped ? " lower" : " higher"}</span>
        </span>
      )}
    </span>
  );
}
