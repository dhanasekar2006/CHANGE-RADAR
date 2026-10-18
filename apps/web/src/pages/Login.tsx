import { FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { API_BASE_URL } from "@/api/config";
import { Logo } from "@/components/Logo";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

const FEATURES = [
  { title: "Compare prices across stores", hint: "See the cheapest in-stock price for every product." },
  { title: "Watch the price history", hint: "Spot real discounts with 1, 3 and 6 month charts." },
  { title: "Get alerted on a price drop", hint: "Set a target price and we notify you by email or Telegram." },
];

function describeError(err: unknown): string {
  if (err instanceof TypeError) {
    return `Can't reach the server at ${API_BASE_URL}. Make sure the API is running, then try again.`;
  }
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many attempts. Please wait a minute and try again.";
    if (err.status >= 500) return "The server hit a problem. Please try again in a moment.";
    if (err.code === "invalid_credentials") return err.message;
    if (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 409) {
      return "Incorrect password for this email.";
    }
    return err.message || "Couldn't sign you in.";
  }
  return "Something went wrong. Please try again.";
}

const field = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  mail: field("M3 6h18v12H3V6Zm0 1 9 6 9-6"),
  lock: field("M6 11h12v9H6v-9Zm3 0V8a3 3 0 0 1 6 0v3"),
  eye: field("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"),
  eyeOff: field("M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"),
  check: field("M5 12.5l4.5 4.5L19 7.5"),
};

function InputField({
  label,
  icon,
  hint,
  trailing,
  ...props
}: {
  label: string;
  icon: React.ReactNode;
  hint?: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">{icon}</span>
        <input {...props} className={`input !pl-9 ${trailing ? "!pr-10" : ""}`} />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </span>
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only same-site paths, so ?next= can't bounce someone to another origin.
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/prices";

  // Already signed in (and not mid-submit): skip the form.
  if (accessToken && !submitting) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const credentials = { email: email.trim(), password };
      let tokens: TokenPair;
      try {
        tokens = await api.post<TokenPair>("/auth/login", credentials);
      } catch (err) {
        // Unknown email (or wrong password): any email may sign in, so try creating the account.
        // An existing email answers 409, which means the password was simply wrong.
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
        if (password.length < 8) {
          throw new ApiError(
            401,
            "invalid_credentials",
            "No account for this email yet. Use a password of at least 8 characters to create one.",
          );
        }
        tokens = await api.post<TokenPair>("/auth/register", {
          ...credentials,
          // The API still requires a workspace; price tracking doesn't surface it.
          workspace_name: `${credentials.email.split("@")[0]}'s tracker`.slice(0, 255),
        });
      }
      // /auth/me needs the bearer token, so stash it before the call.
      useAuthStore.setState({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      const user = await api.get<User>("/auth/me");
      setSession(tokens.access_token, tokens.refresh_token, user);
      navigate(destination, { replace: true });
    } catch (err) {
      clearSession();
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-slate-900/40 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
        />
        <Logo />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Buy at the <span className="text-sky-300">right price</span>.
          </h2>
          <p className="mt-4 text-slate-400">
            VilaiWatch tracks product prices across online stores and tells you the moment they drop.
          </p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/30">
                  {ICONS.check}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-100">{feature.title}</span>
                  <span className="block text-sm text-slate-500">{feature.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-600">© {new Date().getFullYear()} VilaiWatch</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in or sign up</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Use any email. New here? We'll create your account with the password you enter.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <InputField
              label="Email"
              icon={ICONS.mail}
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              label="Password"
              icon={ICONS.lock}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              hint="At least 8 characters for a new account."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="rounded-md p-2 text-slate-500 hover:text-slate-200"
                >
                  {showPassword ? ICONS.eyeOff : ICONS.eye}
                </button>
              }
            />

            <button type="submit" disabled={submitting} className="btn-primary w-full !py-2.5">
              {submitting && (
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {submitting ? "Signing in…" : "Continue"}
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}
