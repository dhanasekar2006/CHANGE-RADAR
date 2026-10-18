import { describe, expect, it } from "vitest";

import { reconnectDelay } from "@/hooks/useLivePrices";

describe("reconnectDelay", () => {
  it("backs off exponentially with jitter and caps at 30s", () => {
    const low = () => 0; // minimum jitter: half the ceiling
    const high = () => 1; // maximum jitter: the full ceiling
    expect([0, 1, 2, 3].map((n) => reconnectDelay(n, high))).toEqual([1000, 2000, 4000, 8000]);
    expect(reconnectDelay(0, low)).toBe(500);
    expect(reconnectDelay(20, high)).toBe(30_000);
    expect(reconnectDelay(20, low)).toBe(15_000);
  });
});
