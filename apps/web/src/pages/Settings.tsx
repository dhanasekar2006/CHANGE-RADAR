import clsx from "clsx";
import { Mail, MessageCircle, Radar, Send } from "lucide-react";

import { USE_MOCK } from "@/api/config";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { useAuthed } from "@/hooks/useAuthed";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/auth";

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const authed = useAuthed();

  return (
    <div className="space-y-8">
      <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
        Settings
      </h1>

      {authed && !USE_MOCK && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Workspace</h2>
          <Card className="!p-3">
            <ListRow
              icon={Radar}
              label="Monitors"
              value="Pages you watch"
              to="/prices/monitors"
            />
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Appearance</h2>
        <Card className="!p-3">
          <div role="radiogroup" aria-label="Theme" className="flex gap-2">
            {THEMES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={clsx(
                  "min-h-[44px] flex-1 rounded-full text-sm font-semibold transition-colors duration-150",
                  theme === id
                    ? "bg-ink text-surface"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Notification channels</h2>
        <Card className="!p-3">
          <ListRow
            icon={Mail}
            label="Email"
            value={user ? `${user.email} · set per alert` : "Set per alert"}
          />
          <ListRow icon={Send} label="Telegram" value="Set per alert" />
          <ListRow
            icon={MessageCircle}
            label="WhatsApp"
            value="Set per alert"
          />
        </Card>
        <p className="text-[13px] text-ink-2">
          Channels are picked when you create an alert. Account-wide channel
          settings aren't available yet.
        </p>
      </section>
    </div>
  );
}
