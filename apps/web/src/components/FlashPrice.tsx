import { formatINR } from "@/lib/format";
import { flashKey, useLiveStore } from "@/store/live";

/** A price that briefly glows green when it drops and orange when it rises. */
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
  const flash = useLiveStore((s) => s.flashes[flashKey(productId, store)]);
  const tone = flash?.direction === "down" ? "bg-emerald-500/30 text-emerald-200" : flash?.direction === "up" ? "bg-orange-500/30 text-orange-200" : "";
  return (
    <span className={`rounded px-1.5 py-0.5 transition-colors duration-700 ${tone} ${className}`}>
      {formatINR(price)}
    </span>
  );
}
