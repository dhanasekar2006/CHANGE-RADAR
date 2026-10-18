# Architecture

## Services

ChangeRadar is split into three deployables that share two Python packages:

```
apps/api ──┐
           ├── packages/core (detection engine, ORM models, storage, notifiers)
apps/worker┘         └── packages/shared (logging, errors, constants)

apps/web ──> talks to apps/api over HTTP only
```

- **apps/api** is a stateless FastAPI service. It owns auth, RBAC, and CRUD for
  workspaces/monitors/channels, and serves the change feed. It never fetches a
  monitored URL or runs a diff itself — it only reads/writes rows and enqueues
  work onto Celery (`src/services/task_dispatch.py`).
- **apps/worker** is where all the actual monitoring happens: `check_monitor`
  runs the fetch → extract → normalize → diff → score pipeline for one monitor,
  `ai_analyze` refines the score with an LLM call, `notify` fans the result out
  to channels, and `maintenance` handles scheduling and housekeeping (see
  [detection-pipeline.md](detection-pipeline.md)).
- **apps/web** is a Vite/React SPA. It only talks to the api over HTTP/JSON; it
  has no direct access to the database, Redis, or object storage.

## Why a shared `packages/core`

Both api and worker need the same ORM models (so a `Monitor` row means the
same thing whether the api created it or the worker updated `last_checked_at`
on it) and the same storage/notifier clients. Rather than duplicate that or
have one service import the other, both import from `packages/core`, and
neither imports the other's app code. The one exception is `task_dispatch.py`
in the api, which sends Celery tasks by name/queue without importing the
worker's task implementations — the api and worker can be deployed and scaled
independently.

## Data flow for one monitor

1. `beat` ticks `worker.maintenance.dispatch_due_checks` every 60s, which
   enqueues `check_monitor` for every monitor whose `next_check_at` has passed.
2. `check_monitor` fetches, extracts, normalizes, and diffs against the most
   recent `Snapshot`. If there's a change, it writes a new `Snapshot` and a
   `Change` row, uploads the diff payload to object storage, and enqueues
   `ai_analyze`.
3. `ai_analyze` asks the configured model to refine the significance/summary,
   falling back to the cheap similarity-based score on any failure, then
   enqueues `notify`.
4. `notify` sends the change to every active `Channel` attached to the
   monitor, independently per channel.

## Storage

Postgres holds all relational state (workspaces, monitors, changes, etc).
Snapshot bodies and diff payloads live in S3-compatible object storage
(MinIO locally) — Postgres only stores pointers (`storage_key`) and metadata
(`content_hash`, `size_bytes`), keeping row sizes small regardless of how
large a monitored page is.

## Multi-tenancy

Every domain row (`Monitor`, `Change`, `Channel`, ...) is scoped to a
`Workspace`. `WorkspaceMember.role` (viewer/member/admin/owner) gates writes
via `apps/api/src/security/rbac.py`; every router resolves the caller's
membership before touching a workspace's data.
