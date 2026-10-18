import { useChannels } from "@/api/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import type { ChannelType } from "@/types";

const TYPE_LABEL: Record<ChannelType, string> = {
  email: "Email",
  slack: "Slack",
  discord: "Discord",
  telegram: "Telegram",
  webhook: "Webhook",
};

export function Channels() {
  const workspaceId = useWorkspaceId();
  const { data: channels, isLoading } = useChannels(workspaceId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notification channels</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {channels?.map((channel) => (
          <div key={channel.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{channel.name}</div>
              <div className="text-xs text-slate-500">{TYPE_LABEL[channel.type]}</div>
            </div>
            <span className={`text-xs ${channel.is_active ? "text-emerald-400" : "text-slate-500"}`}>
              {channel.is_active ? "active" : "disabled"}
            </span>
          </div>
        ))}
        {channels?.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No channels configured. Add one to start receiving notifications.
          </div>
        )}
      </div>
    </div>
  );
}
