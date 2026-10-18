/** Query keys for the price-tracking views, shared by hooks and the live-update handler. */
export const priceKeys = {
  search: (q: string) => ["search", q] as const,
  searchAll: ["search"] as const,
  product: (id: string) => ["product", id] as const,
  history: (id: string, range: string) => ["history", id, range] as const,
  historyAll: (id: string) => ["history", id] as const,
  deals: ["deals"] as const,
  alerts: ["alerts"] as const,
};

export const REFETCH = {
  product: 60_000,
  deals: 5 * 60_000,
  history: 5 * 60_000,
} as const;
