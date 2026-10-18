export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** When true, VilaiWatch runs entirely on the in-browser mock layer (no backend needed). */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === "true";

/** ws(s)://<api host>/ws/prices, derived from the HTTP base URL. */
export function priceSocketUrl(): string {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws/prices`;
  return url.toString();
}
