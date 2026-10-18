import { Link, NavLink } from "react-router-dom";

import { USE_MOCK } from "@/api/config";
import { LiveBadge } from "@/components/LiveBadge";
import { Logo } from "@/components/Logo";
import { useAuthed } from "@/hooks/useAuthed";
import { useAuthStore } from "@/store/auth";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`;

export function Navbar() {
  const authed = useAuthed();
  const clearSession = useAuthStore((s) => s.clearSession);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/prices" aria-label="VilaiWatch home">
            <Logo name="VilaiWatch" />
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/prices" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/prices/search" className={navClass}>
              Search
            </NavLink>
            <NavLink to="/prices/alerts" className={navClass}>
              Alerts
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {USE_MOCK && (
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">
              Demo data
            </span>
          )}
          <LiveBadge />
          {!USE_MOCK &&
            (authed ? (
              <button
                onClick={clearSession}
                className="btn-ghost !py-1.5"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login?next=/prices"
                className="btn-primary !py-1.5"
              >
                Sign in
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
