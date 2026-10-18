# ChangeRadar

ChangeRadar watches web pages, feeds, and APIs for changes, diffs each new snapshot against the last, scores how significant the change is, and notifies you on the channels you care about.

It also powers **VilaiWatch**: live price tracking across stores, with history, deals, and target-price alerts. See [docs/price-tracking.md](docs/price-tracking.md) (UI at `/prices`).

## Architecture

- `apps/api` — FastAPI HTTP service. Owns auth, CRUD for monitors/channels/workspaces, and the change feed. No detection logic lives here.
- `apps/worker` — Celery workers + beat scheduler. Runs monitor checks, diffing, AI scoring, and notification fan-out on a schedule.
- `apps/web` — React + Vite dashboard.
- `packages/core` — Shared detection engine: fetchers, extractors, normalizers, differs, scoring, ORM models, storage, notifiers. Imported by both `api` and `worker`.
- `packages/shared` — Cross-cutting helpers (logging, error taxonomy, constants) used by every service.
- `migrations` — Alembic revisions for the shared Postgres schema.
- `infra` — Docker, nginx, k8s, and monitoring config.

It also powers **VilaiWatch**, live price tracking across stores with history, deals and target-price alerts: see [docs/price-tracking.md](docs/price-tracking.md) (UI at `/prices`).

See [docs/architecture.md](docs/architecture.md) for the full picture and [docs/detection-pipeline.md](docs/detection-pipeline.md) for how a single monitor run flows through fetch → extract → normalize → diff → score → notify.

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

A one-shot `migrate` service applies Alembic migrations before `api`, `worker`, and `beat` start.

- API: http://localhost:8000 (docs at `/docs`)
- Web: http://localhost:5173
- Postgres: localhost:5432, Redis: localhost:6379, MinIO console: http://localhost:9001

For hot-reload during development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Local development without Docker

`.env` uses Docker service names (`postgres`, `redis`, `minio`) that don't resolve from the host.
Use `.env.local` instead; the Makefile loads it automatically.

```bash
cp .env.local.example .env.local
make infra     # starts postgres, redis, minio in Docker
make install   # installs api, worker, and web deps
make migrate   # applies Alembic migrations
make api       # runs FastAPI with reload
make worker    # runs Celery worker
make beat      # runs Celery beat scheduler
make web       # runs the Vite dev server
```

## Testing

```bash
make test          # api + worker unit tests
make test-e2e       # Playwright UI tests (requires the stack running)
```

See [Makefile](Makefile) for the full list of targets.
