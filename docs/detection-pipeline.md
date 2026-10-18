# Detection pipeline

How one `check_monitor` run turns a URL into (maybe) a notification. Source:
`apps/worker/src/tasks/check_monitor.py`.

```
fetch → extract → normalize → diff → score → notify
```

## 1. Fetch (`packages/core/fetchers`)

Picked by `Monitor.fetcher_type`:

| Type      | Implementation    | Use for                                    |
|-----------|--------------------|---------------------------------------------|
| `http`    | `HttpFetcher`      | Static pages, JSON/XML APIs (default)       |
| `browser` | `BrowserFetcher`   | JS-rendered SPAs (Playwright)               |
| `feed`    | `FeedFetcher`      | RSS/Atom/CSV/XLSX                           |

`HttpFetcher` sends conditional GETs (`If-None-Match`/`If-Modified-Since`)
where the target supports them, short-circuiting the rest of the pipeline on
a 304.

## 2. Extract (`packages/core/extractors`)

Picked by `Monitor.extractor_type`, given `Monitor.selector`:

- `css` — BeautifulSoup `.select()`
- `xpath` — lxml
- `jsonpath` — for JSON API responses
- `readability` — Mozilla-Readability-style article extraction, ignores `selector`

Extractors raise `ExtractionError` when a selector matches nothing, which
marks the `MonitorRun` failed rather than silently diffing empty strings.

## 3. Normalize (`packages/core/normalizers`)

Two passes, always applied in order:

1. `apply_ignore_rules` strips user-configured noise (timestamps, ad slots,
   view counters) via regex or literal match, defined per-monitor.
2. `normalize_whitespace` collapses repeated whitespace so formatting-only
   churn never counts as a change.

## 4. Diff (`packages/core/differs`)

`extractor_type == jsonpath` uses `JsonDiffer` (structural JSON patch);
everything else uses `TextDiffer` (unified diff). `VisualDiffer` exists for
screenshot comparison but isn't wired into `check_monitor` yet — it's used
directly by anything comparing two `BrowserFetcher` screenshots.

Every differ returns a `DiffResult` with `similarity_score` (0.0–1.0). If
`has_changes` is false, the run stops here — no `Change` row is written.

## 5. Score (`packages/core/scoring`)

`check_monitor` calls `score_significance(similarity_score)` for a cheap,
free first-pass significance (noise/minor/moderate/major/critical) purely
from the similarity score's threshold band, and writes the `Change` row
immediately so it shows up in the feed without waiting on an LLM call.

`ai_analyze` (a separate task, enqueued right after) then asks the
configured Anthropic model to read the actual diff and can override both the
significance and write `Change.ai_summary`. It always falls back to the
similarity-based score on any failure (missing key, timeout, rate limit) —
AI scoring is a refinement, never a blocker.

## 6. Notify (`packages/core/notifiers`)

`notify` (enqueued by `ai_analyze` regardless of whether AI scoring
succeeded) sends the change to every active `Channel` on
`Monitor.channel_ids`. Each channel type (email/Slack/Discord/
Telegram/webhook) has its own notifier in `NOTIFIER_REGISTRY`; one channel
failing doesn't block delivery to the others, and the task retries with
jittered backoff (`utils/backoff.py`) if any channel failed.

## Scheduling and safety nets

- `worker.maintenance.dispatch_due_checks` (every 60s) is the only thing that
  turns "time has passed" into an actual `check_monitor.delay()` call.
- `utils/locks.py` prevents two runs for the same monitor from overlapping
  (a slow browser fetch plus a short interval could otherwise queue a second
  run before the first finishes).
- `utils/rate_limiter.py` caps fetches per target domain, independent of how
  many monitors point at it.
- `worker.maintenance.sweep_stale_monitors` flags monitors whose
  `last_checked_at` is older than 3x their own interval as `error`, so silent
  failures surface in the dashboard instead of just going dark.
