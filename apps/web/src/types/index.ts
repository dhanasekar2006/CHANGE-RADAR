// Hand-written for now; swap for a generated client (openapi-typescript
// pointed at the api's /openapi.json) once the schema stabilizes.

export type MonitorStatus = "active" | "paused" | "error";
export type FetcherType = "http" | "browser" | "feed";
export type ExtractorType = "css" | "xpath" | "jsonpath" | "readability";
type DiffType = "text" | "json" | "visual";
export type ChangeSignificance = "noise" | "minor" | "moderate" | "major" | "critical";
export type ChannelType = "email" | "slack" | "discord" | "telegram" | "webhook";

interface IgnoreRule {
  pattern: string;
  type: "regex" | "literal";
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  fetcher_type: FetcherType;
  extractor_type: ExtractorType;
  selector: string | null;
  ignore_rules: IgnoreRule[];
  check_interval_seconds: number;
  status: MonitorStatus;
  last_checked_at: string | null;
  next_check_at: string | null;
  channel_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Change {
  id: string;
  monitor_id: string;
  previous_snapshot_id: string | null;
  new_snapshot_id: string;
  diff_type: DiffType;
  diff_summary: string | null;
  similarity_score: number | null;
  significance: ChangeSignificance;
  ai_summary: string | null;
  acknowledged: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChangeDetail extends Change {
  diff_payload: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  type: ChannelType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_verified: boolean;
}
