import { API_BASE_URL } from "@/api/config";
import { useAuthStore } from "@/store/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // An expired/invalid token on a normal call: drop the session so RequireAuth sends the user to /login.
    // Skip /auth/* so a wrong password on the login form isn't treated as a lapsed session.
    if (response.status === 401 && accessToken && !path.startsWith("/auth/")) {
      useAuthStore.getState().clearSession();
    }
    throw new ApiError(response.status, body.code ?? "unknown_error", body.message ?? response.statusText);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
