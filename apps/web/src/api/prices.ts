import { api } from "@/api/client";
import { USE_MOCK } from "@/api/config";
import type {
  AlertInput,
  Deal,
  HistoryPoint,
  HistoryRange,
  PriceAlert,
  ProductDetail,
  SearchResponse,
} from "@/types/prices";

// The mock module is a separate chunk that is only fetched when VITE_USE_MOCK=true.
const mock = () => import("@/data/mock").then((m) => m.mockApi);

export const pricesApi = {
  search: async (q: string): Promise<SearchResponse> =>
    USE_MOCK ? (await mock()).search(q) : api.get(`/products/search?q=${encodeURIComponent(q)}`),

  product: async (id: string): Promise<ProductDetail> =>
    USE_MOCK ? (await mock()).product(id) : api.get(`/products/${id}`),

  history: async (id: string, range: HistoryRange): Promise<HistoryPoint[]> =>
    USE_MOCK ? (await mock()).history(id, range) : api.get(`/products/${id}/history?range=${range}`),

  deals: async (): Promise<Deal[]> => (USE_MOCK ? (await mock()).deals() : api.get("/deals/top")),

  track: async (url: string): Promise<ProductDetail> => {
    if (USE_MOCK) throw new Error("Tracking new links needs the backend (VITE_USE_MOCK is on).");
    return api.post("/products/track", { url });
  },

  alerts: async (): Promise<PriceAlert[]> => (USE_MOCK ? (await mock()).alerts() : api.get("/alerts")),

  createAlert: async (input: AlertInput): Promise<PriceAlert> =>
    USE_MOCK ? (await mock()).createAlert(input) : api.post("/alerts", input),

  updateAlert: async (id: string, patch: Partial<AlertInput>): Promise<PriceAlert> =>
    USE_MOCK ? (await mock()).updateAlert(id, patch) : api.patch(`/alerts/${id}`, patch),

  deleteAlert: async (id: string): Promise<void> =>
    USE_MOCK ? (await mock()).deleteAlert(id) : api.delete(`/alerts/${id}`),
};
