export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** When true, VilaiWatch runs entirely on the in-browser mock layer (no backend needed). */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === "true";

/** ws(s)://<api host>/ws/prices, derived from the HTTP base URL. */
export function priceSocketUrl(): string {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws/prices`;
  return url.toString();
}

/**
 * The API only allows the origin it was configured with (CORS), usually http://localhost:5173. Opening the
 * app as http://127.0.0.1:5173 makes every API call fail, so send that visit to the matching localhost URL.
 * Returns null when no redirect is needed.
 */
export function loopbackRedirect(
  page: Location = window.location,
): string | null {
  const loopback = page.hostname === "127.0.0.1" || page.hostname === "[::1]";
  if (!loopback || new URL(API_BASE_URL).hostname !== "localhost") return null;
  return `${page.protocol}//localhost${page.port ? `:${page.port}` : ""}${page.pathname}${page.search}${page.hash}`;
}
