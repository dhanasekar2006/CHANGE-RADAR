import clsx from "clsx";
import { Bell, Home, Lightbulb, Radar, Search, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { USE_MOCK } from "@/api/config";
import { LiveBadge } from "@/components/LiveBadge";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useAuthed } from "@/hooks/useAuthed";
import { useAuthStore } from "@/store/auth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Shown in the floating mobile bar (it has room for four). */
  mobile?: boolean;
  /** Hidden from signed-out visitors and in mock mode (needs the real API). */
  authedOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/prices", label: "Home", icon: Home, end: true, mobile: true },
  { to: "/prices/search", label: "Search", icon: Search },
  { to: "/prices/insights", label: "Insights", icon: Lightbulb, mobile: true },
  { to: "/prices/alerts", label: "Watchlist", icon: Bell, mobile: true },
  { to: "/prices/monitors", label: "Monitors", icon: Radar, authedOnly: true },
  { to: "/prices/settings", label: "Settings", icon: SettingsIcon, mobile: true },
];

function SessionControl() {
  const authed = useAuthed();
  const clearSession = useAuthStore((s) => s.clearSession);
  if (USE_MOCK) return <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-2">Demo data</span>;
  return authed ? (
    <button
      type="button"
      onClick={clearSession}
      className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      Sign out
    </button>
  ) : (
    <ButtonLink to="/login?next=/prices">Sign in</ButtonLink>
  );
}

/** Desktop (≥1024px): fixed left sidebar. */
export function Sidebar() {
  const authed = useAuthed();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col justify-between border-r border-line bg-surface p-5 lg:flex">
      <div className="flex flex-col gap-8">
        <Link to="/prices" aria-label="VilaiWatch home" className="px-2 pt-1">
          <Logo name="VilaiWatch" />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.authedOnly || (authed && !USE_MOCK)).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex min-h-[44px] items-center gap-3 rounded-full px-4 text-[15px] font-semibold transition-colors duration-150",
                  isActive ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )
              }
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex flex-col items-start gap-3">
        <LiveBadge />
        <SessionControl />
      </div>
    </aside>
  );
}

/** Below 1024px: slim top bar with the brand and session controls. */
export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 lg:hidden">
      <Link to="/prices" aria-label="VilaiWatch home">
        <Logo name="VilaiWatch" />
      </Link>
      <div className="flex items-center gap-2">
        <LiveBadge />
        <SessionControl />
      </div>
    </header>
  );
}

/** Below 1024px: floating dark pill; the active item sits in a white circle. */
export function BottomNav() {
  const items = NAV_ITEMS.filter((item) => item.mobile);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="flex w-full max-w-sm items-center justify-around rounded-full bg-ink p-2 shadow-soft">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                clsx(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-150",
                  isActive ? "bg-surface text-ink" : "text-surface/70 hover:text-surface",
                )
              }
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
