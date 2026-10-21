import { useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { API_BASE_URL } from "@/api/config";
import { LampLogin } from "@/components/LampLogin";
import { LOGIN_FONTS, loadFonts } from "@/lib/loadFonts";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

// Runs when this route chunk loads, before first paint of the page.
loadFonts(LOGIN_FONTS);

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function describeError(err: unknown): string {
  if (err instanceof TypeError) {
    return `Can't reach the server at ${API_BASE_URL}. Make sure the API is running, then try again.`;
  }
  if (err instanceof ApiError) {
    if (err.status === 429)
      return "Too many attempts. Please wait a minute and try again.";
    if (err.status >= 500)
      return "The server hit a problem. Please try again in a moment.";
    if (err.code === "invalid_credentials") return err.message;
    if (err.status === 409)
      return "An account with this email already exists. Try signing in instead.";
    if (err.status === 401 || err.status === 403 || err.status === 404)
      return "Invalid email or password.";
    return err.message || "Couldn't sign you in.";
  }
  return "Something went wrong. Please try again.";
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const submitting = useRef(false);

  // Only same-site paths, so ?next= can't bounce someone to another origin.
  const next = searchParams.get("next");
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/prices";

  // Already signed in: skip the form. Not mid-submit: the token is stored a moment before the profile loads.
  if (accessToken && !submitting.current)
    return <Navigate to={destination} replace />;

  async function start(request: () => Promise<TokenPair>) {
    submitting.current = true;
    try {
      const tokens = await request();
      // /auth/me needs the bearer token, so stash it before the call.
      useAuthStore.setState({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      const user = await api.get<User>("/auth/me");
      setSession(tokens.access_token, tokens.refresh_token, user);
      navigate(destination, { replace: true });
    } catch (err) {
      submitting.current = false;
      clearSession();
      throw new Error(describeError(err));
    }
  }

  return (
    <LampLogin
      onSignIn={(email, password) =>
        start(() => api.post<TokenPair>("/auth/login", { email, password }))
      }
      onSignUp={(name, email, password) =>
        start(() =>
          api.post<TokenPair>("/auth/register", {
            email,
            password,
            full_name: name,
            // The API still requires a workspace; price tracking doesn't surface it. Named from the email
            // (unique per account) because the API derives a unique slug from the name.
            workspace_name: `${email.split("@")[0]}'s tracker`.slice(0, 255),
          }),
        )
      }
    />
  );
}
