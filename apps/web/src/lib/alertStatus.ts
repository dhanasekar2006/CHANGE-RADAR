import type { PriceAlert } from "@/types/prices";

/** An alert is "reached" once its price is at or below target, or it has already fired. */
export function isReached(alert: PriceAlert): boolean {
  return alert.triggered_at !== null || (alert.current_price !== null && alert.current_price <= alert.target_price);
}
