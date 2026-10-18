import { useNow } from "@/hooks/useNow";
import { timeAgo } from "@/lib/format";

/** "Updated 5 min ago", re-evaluated every 30s from the server's checked_at. */
export function UpdatedAgo({ checkedAt, prefix = "Updated" }: { checkedAt: string | null; prefix?: string }) {
  const now = useNow(30_000);
  return (
    <time dateTime={checkedAt ?? undefined} title={checkedAt ? new Date(checkedAt).toLocaleString("en-IN") : undefined}>
      {checkedAt ? `${prefix} ${timeAgo(checkedAt, now)}` : "Not checked yet"}
    </time>
  );
}
