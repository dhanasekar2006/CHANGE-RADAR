import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateMonitor } from "@/api/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import type { ExtractorType, FetcherType } from "@/types";

export function MonitorForm() {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const createMonitor = useCreateMonitor(workspaceId);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fetcherType, setFetcherType] = useState<FetcherType>("http");
  const [extractorType, setExtractorType] = useState<ExtractorType>("css");
  const [selector, setSelector] = useState("");
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(15);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const monitor = await createMonitor.mutateAsync({
      name,
      url,
      fetcher_type: fetcherType,
      extractor_type: extractorType,
      selector: selector || null,
      check_interval_seconds: checkIntervalMinutes * 60,
    });
    navigate(`/w/${workspaceId}/monitors/${monitor.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">New monitor</h1>

      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
      </Field>

      <Field label="URL">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          type="url"
          placeholder="https://example.com/pricing"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fetcher">
          <select value={fetcherType} onChange={(e) => setFetcherType(e.target.value as FetcherType)} className={inputClass}>
            <option value="http">HTTP</option>
            <option value="browser">Browser (JS-rendered)</option>
            <option value="feed">Feed (RSS/CSV/XLSX)</option>
          </select>
        </Field>

        <Field label="Extractor">
          <select
            value={extractorType}
            onChange={(e) => setExtractorType(e.target.value as ExtractorType)}
            className={inputClass}
          >
            <option value="css">CSS selector</option>
            <option value="xpath">XPath</option>
            <option value="jsonpath">JSONPath</option>
            <option value="readability">Readability (auto)</option>
          </select>
        </Field>
      </div>

      <Field label="Selector (optional)">
        <input
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          placeholder="#price, //div[@class='price'], $.data.price"
          className={inputClass}
        />
      </Field>

      <Field label="Check interval (minutes)">
        <input
          type="number"
          min={1}
          value={checkIntervalMinutes}
          onChange={(e) => setCheckIntervalMinutes(Number(e.target.value))}
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={createMonitor.isPending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
      >
        {createMonitor.isPending ? "Creating…" : "Create monitor"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
    </label>
  );
}
