import { bestPriceSeries, buildStoreSeries, buyAdvice, computeStats, priceAt } from "@/lib/priceStats";
import type { HistoryPoint } from "@/types/prices";

const DAY = 24 * 60 * 60 * 1000;

export type InsightTone = "good" | "warn" | "neutral";

export interface Insight {
  productId: string;
  productName: string;
  tone: InsightTone;
  text: string;
}

/**
 * Plain-language facts about one product, derived only from its price history
 * (3-month window). Returns nothing when there isn't enough history to say anything honest.
 */
export function buildInsights(productId: string, productName: string, history: HistoryPoint[], now: number): Insight[] {
  const best = bestPriceSeries(buildStoreSeries(history));
  const stats = computeStats(best, now);
  if (!stats || best.length === 0) return [];

  const make = (tone: InsightTone, text: string): Insight => ({ productId, productName, tone, text });
  const out: Insight[] = [];

  const advice = buyAdvice(stats, best, "3 months", now);
  if (advice.tone === "good" && stats.current <= stats.lowest * 1.02) {
    out.push(make("good", "Lowest price in 3 months"));
  } else if (advice.tone === "good") {
    out.push(make("good", advice.detail.replace(/\.$/, "")));
  } else if (advice.tone === "wait") {
    out.push(make("warn", advice.detail.replace(/\.$/, "")));
  }

  const weekAgo = now - 7 * DAY;
  const before = best[0].t <= weekAgo ? priceAt(best, weekAgo) : null;
  if (before !== null && before > 0) {
    const change = ((stats.current - before) / before) * 100;
    if (change <= -1) out.push(make("good", `Dropped ${Math.abs(change).toFixed(0)}% this week`));
    else if (change >= 1) out.push(make("warn", `Rose ${change.toFixed(0)}% this week`));
  }

  return out;
}
