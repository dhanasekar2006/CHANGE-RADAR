import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { api } from "@/api/client";
import { Logo } from "@/components/Logo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV_ITEMS = [
  { label: "Dashboard", path: "", icon: icon("M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6V11h-6v9Zm0-16v4h6V4h-6Z") },
  { label: "Monitors", path: "monitors", icon: icon("M3 12h4l3-8 4 16 3-8h4") },
  { label: "Channels", path: "channels", icon: icon("M4 5h16v11H8l-4 4V5Z") },
  { label: "Settings", path: "settings", icon: icon("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.4 2.4a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9c.5.4 1.1.7 1.7 1L11 21h4l.4-2.4c.6-.3 1.2-.6 1.7-1l2.3.9 2-3.5-2-1.5Z") },
];

export function Layout() {
  const workspaceId = useWorkspaceId();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  // After a page reload only the tokens survive; refetch the profile so the sidebar can show who's signed in.
  useEffect(() => {
    if (user) return;
    api
      .get<User>("/auth/me")
      .then((me) => {
        const { accessToken, refreshToken, setSession } = useAuthStore.getState();
        if (accessToken && refreshToken) setSession(accessToken, refreshToken, me);
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur md:flex">
        <div className="mb-8 px-2 pt-1">
          <Logo />
        </div>
        <p className="eyebrow mb-2 px-3">Workspace</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/w/${workspaceId}/${item.path}`}
              end={item.path === ""}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-sky-600/15 text-sky-200 ring-1 ring-inset ring-sky-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-slate-800/80 pt-4">
          <NavLink to="/prices" className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-100">
            VilaiWatch prices →
          </NavLink>
          <div className="flex items-center gap-3 px-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600/20 text-sm font-semibold uppercase text-sky-200 ring-1 ring-inset ring-sky-500/30"
            >
              {(user?.full_name ?? user?.email ?? "?").charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{user?.full_name ?? user?.email ?? "Signed in"}</p>
              <button onClick={clearSession} className="text-xs text-slate-500 hover:text-slate-200">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 md:hidden">
          <Logo />
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={`/w/${workspaceId}/${item.path}`}
                end={item.path === ""}
                aria-label={item.label}
                className={({ isActive }) =>
                  `rounded-md p-2 ${isActive ? "bg-sky-600/20 text-sky-200" : "text-slate-400"}`
                }
              >
                {item.icon}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
