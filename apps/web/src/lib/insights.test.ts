import { describe, expect, it } from "vitest";

import { buildInsights } from "@/lib/insights";
import type { HistoryPoint } from "@/types/prices";

const NOW = Date.parse("2026-06-30T00:00:00Z");
const day = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
const point = (daysAgo: number, price: number): HistoryPoint => ({ date: day(daysAgo), price, store: "amazon" });

describe("buildInsights", () => {
  it("returns nothing without history", () => {
    expect(buildInsights("p1", "Phone", [], NOW)).toEqual([]);
  });

  it("flags the lowest price and this week's drop", () => {
    const history = [point(60, 30000), point(30, 28000), point(3, 24000)];
    const texts = buildInsights("p1", "Phone", history, NOW).map((i) => i.text);
    expect(texts).toContain("Lowest price in 3 months");
    expect(texts).toContain("Dropped 14% this week");
  });

  it("warns when the price rose this week and sits above average", () => {
    const history = [point(60, 20000), point(10, 20000), point(2, 26000)];
    const insights = buildInsights("p1", "Phone", history, NOW);
    expect(insights.some((i) => i.tone === "warn" && i.text === "Rose 30% this week")).toBe(true);
  });

  it("skips the weekly change when history is shorter than a week", () => {
    const history = [point(3, 20000), point(1, 18000)];
    expect(buildInsights("p1", "Phone", history, NOW).some((i) => i.text.includes("this week"))).toBe(false);
  });
});
