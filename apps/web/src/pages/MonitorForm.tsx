import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCreateMonitor, useMonitor, useUpdateMonitor } from "@/api/hooks";
import { ErrorState } from "@/components/QueryState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMonitorsContext } from "@/hooks/useMonitorsContext";
import type { ExtractorType, FetcherType, Monitor } from "@/types";

interface FormValues {
  name: string;
  url: string;
  fetcherType: FetcherType;
  extractorType: ExtractorType;
  selector: string;
  intervalMinutes: number;
}

const DEFAULTS: FormValues = {
  name: "",
  url: "",
  fetcherType: "http",
  extractorType: "css",
  selector: "",
  intervalMinutes: 15,
};

function fromMonitor(m: Monitor): FormValues {
  return {
    name: m.name,
    url: m.url,
    fetcherType: m.fetcher_type,
    extractorType: m.extractor_type,
    selector: m.selector ?? "",
    intervalMinutes: Math.max(1, Math.round(m.check_interval_seconds / 60)),
  };
}

function MonitorFields({
  initial,
  monitorId,
}: {
  initial: FormValues;
  monitorId?: string;
}) {
  const { workspaceId } = useMonitorsContext();
  const navigate = useNavigate();
  const create = useCreateMonitor(workspaceId);
  const update = useUpdateMonitor(workspaceId, monitorId);
  const [values, setValues] = useState<FormValues>(initial);

  const mutation = monitorId ? update : create;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const saved = await mutation.mutateAsync({
      name: values.name.trim(),
      url: values.url.trim(),
      fetcher_type: values.fetcherType,
      extractor_type: values.extractorType,
      selector: values.selector.trim() || null,
      check_interval_seconds: Math.max(1, values.intervalMinutes) * 60,
    });
    navigate(`/prices/monitors/${saved.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Name">
        <input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
          maxLength={255}
          className={inputClass}
        />
      </Field>

      <Field label="URL">
        <input
          value={values.url}
          onChange={(e) => set("url", e.target.value)}
          required
          type="url"
          placeholder="https://example.com/pricing"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Fetcher">
          <select
            value={values.fetcherType}
            onChange={(e) => set("fetcherType", e.target.value as FetcherType)}
            className={inputClass}
          >
            <option value="http">HTTP</option>
            <option value="browser">Browser (JS-rendered)</option>
            <option value="feed">Feed (RSS/CSV/XLSX)</option>
          </select>
        </Field>

        <Field label="Extractor">
          <select
            value={values.extractorType}
            onChange={(e) =>
              set("extractorType", e.target.value as ExtractorType)
            }
            className={inputClass}
          >
            <option value="css">CSS selector</option>
            <option value="xpath">XPath</option>
            <option value="jsonpath">JSONPath</option>
            <option value="readability">Readability (auto)</option>
          </select>
        </Field>
      </div>

      <Field
        label="Selector (optional)"
        hint="Limits the check to part of the page. Leave empty to watch everything."
      >
        <input
          value={values.selector}
          onChange={(e) => set("selector", e.target.value)}
          placeholder="#price, //div[@class='price'], $.data.price"
          className={inputClass}
        />
      </Field>

      <Field label="Check interval (minutes)" hint="At least 1 minute.">
        <input
          type="number"
          min={1}
          required
          value={values.intervalMinutes}
          onChange={(e) => set("intervalMinutes", Number(e.target.value))}
          className={inputClass}
        />
      </Field>

      {mutation.isError && (
        <p role="alert" className="text-[13px] font-semibold text-warn">
          {mutation.error.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving…"
            : monitorId
              ? "Save changes"
              : "Create monitor"}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              monitorId ? `/prices/monitors/${monitorId}` : "/prices/monitors",
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Create (/prices/monitors/new) or edit (/prices/monitors/:monitorId/edit) a monitor. */
export function MonitorForm() {
  const { workspaceId } = useMonitorsContext();
  const { monitorId } = useParams<{ monitorId: string }>();
  const monitor = useMonitor(workspaceId, monitorId);

  const back = (
    <Link
      to={monitorId ? `/prices/monitors/${monitorId}` : "/prices/monitors"}
      className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-bold text-accent-strong hover:underline"
    >
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />{" "}
      {monitorId ? "Monitor" : "Monitors"}
    </Link>
  );

  return (
    <div className="max-w-xl space-y-4">
      {back}
      <h1 className="text-[32px] font-extrabold leading-[38px] text-ink">
        {monitorId ? "Edit monitor" : "New monitor"}
      </h1>
      <Card>
        {!monitorId ? (
          <MonitorFields initial={DEFAULTS} />
        ) : monitor.isError ? (
          <ErrorState error={monitor.error} onRetry={() => monitor.refetch()} />
        ) : monitor.isPending ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <MonitorFields
            initial={fromMonitor(monitor.data)}
            monitorId={monitorId}
          />
        )}
      </Card>
    </div>
  );
}
