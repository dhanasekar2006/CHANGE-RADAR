import type { MonitorStatus } from "@/types";

export const STATUS_TONE = { active: "good", paused: "neutral", error: "warn" } as const satisfies Record<MonitorStatus, string>;

export const STATUS_LABEL: Record<MonitorStatus, string> = { active: "Active", paused: "Paused", error: "Error" };
