import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";

import { formatINR } from "@/lib/format";
import { flashKey, useLiveStore } from "@/store/live";

/** A price that briefly highlights green (with ↓) when it drops and orange (with ↑) when it rises. */
export function FlashPrice({
  productId,
  store,
  price,
  className = "",
}: {
  productId: string;
  store: string;
  price: number | null;
  className?: string;
}) {
  const direction = useLiveStore((s) => s.flashes[flashKey(productId, store)]?.direction);
  return (
    <span
      aria-live="polite"
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums transition-colors duration-700 motion-reduce:transition-none",
        direction === "down" && "bg-good-soft text-good",
        direction === "up" && "bg-warn-soft text-warn",
        className,
      )}
    >
      {direction === "down" && <ArrowDown size={14} strokeWidth={2} aria-hidden />}
      {direction === "up" && <ArrowUp size={14} strokeWidth={2} aria-hidden />}
      {formatINR(price)}
      {direction && <span className="sr-only">{direction === "down" ? " (dropped)" : " (rose)"}</span>}
    </span>
  );
}
