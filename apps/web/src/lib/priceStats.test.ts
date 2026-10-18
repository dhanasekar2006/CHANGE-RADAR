import { describe, expect, it } from "vitest";

import { bestPriceSeries, buildStoreSeries, buyAdvice, computeStats, priceAt } from "@/lib/priceStats";
import type { HistoryPoint } from "@/types/prices";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14);
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const point = (store: string, price: number, daysAgo: number): HistoryPoint => ({ store, price, date: at(daysAgo) });

describe("bestPriceSeries", () => {
  it("tracks the cheapest store as prices cross over", () => {
    const series = buildStoreSeries([
      point("A", 100, 30),
      point("B", 120, 30),
      point("B", 90, 20), // B becomes cheapest
      point("A", 80, 10), // A cheapest again
    ]);
    const best = bestPriceSeries(series);
    expect(best.map((p) => p.price)).toEqual([100, 90, 80]);
  });

  it("drops points where the best price did not change", () => {
    const best = bestPriceSeries(buildStoreSeries([point("A", 100, 30), point("B", 150, 20), point("B", 160, 10)]));
    expect(best).toHaveLength(1);
  });

  it("merges points that share a timestamp", () => {
    const best = bestPriceSeries(buildStoreSeries([point("A", 100, 5), point("B", 90, 5)]));
    expect(best).toEqual([{ t: NOW - 5 * DAY, price: 90 }]);
  });
});

describe("computeStats", () => {
  it("returns null without history", () => {
    expect(computeStats([], NOW)).toBeNull();
  });

  it("weights the average by how long each price held", () => {
    const stats = computeStats(
      [
        { t: NOW - 10 * DAY, price: 100 },
        { t: NOW - 1 * DAY, price: 50 },
      ],
      NOW,
    );
    // 100 for 9 days, 50 for 1 day -> 95, not the plain mean of 75
    expect(stats).toEqual({ lowest: 50, highest: 100, average: 95, current: 50 });
  });
});

describe("buyAdvice", () => {
  const history = (prices: [number, number][]) => bestPriceSeries(buildStoreSeries(prices.map(([p, d]) => point("A", p, d))));
  const advise = (prices: [number, number][]) => {
    const best = history(prices);
    return buyAdvice(computeStats(best, NOW), best, "1M", NOW);
  };

  it("says good when at the lowest price of the range", () => {
    expect(advise([[100, 30], [90, 20], [80, 1]]).tone).toBe("good");
  });

  it("says good when well below the average but not the lowest", () => {
    // long stretch at 100, dipped to 60 briefly, now 90 (10% under the ~98 avg)
    expect(advise([[100, 30], [60, 3], [90, 2]]).tone).toBe("good");
  });

  it("says wait when well above the average", () => {
    expect(advise([[100, 30], [130, 1]]).tone).toBe("wait");
  });

  it("says fair near the average", () => {
    expect(advise([[100, 30], [90, 20], [105, 10], [100, 1]]).tone).toBe("fair");
  });

  it("does not guess with less than a day of history", () => {
    const best = [{ t: NOW - 2 * 60 * 60 * 1000, price: 100 }];
    expect(buyAdvice(computeStats(best, NOW), best, "1M", NOW).tone).toBe("unknown");
  });

  it("does not guess when the price never moved", () => {
    expect(advise([[100, 30]]).tone).toBe("unknown");
  });
});

describe("priceAt", () => {
  const points = [
    { t: 10, price: 5 },
    { t: 20, price: 8 },
  ];
  it("reads the step function", () => {
    expect(priceAt(points, 5)).toBeNull();
    expect(priceAt(points, 10)).toBe(5);
    expect(priceAt(points, 19)).toBe(5);
    expect(priceAt(points, 25)).toBe(8);
  });
});
