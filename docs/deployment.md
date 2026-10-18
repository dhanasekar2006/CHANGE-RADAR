# Deployment

## Local (docker-compose)

```bash
cp .env.example .env
docker compose up --build
```

Services: `postgres`, `redis`, `minio`, `migrate`, `api`, `worker`, `beat`, `web`.
`migrate` is a one-shot job that runs `alembic upgrade head`; `api`, `worker`,
and `beat` start only after it completes successfully. `VITE_API_BASE_URL` is
a build arg for `web` (Vite inlines it at build time).
`docker-compose.dev.yml` overrides `api`/`worker`/`web` to run with
hot-reload and bind-mounted source.

Compose applies migrations automatically. When running the apps on the
host, use `make migrate` (see the README for `.env.local`).

## Launching as a website (single server)

`docker-compose.prod.yml` runs the whole stack behind Caddy, which serves the
site over HTTPS (certificates issued and renewed automatically). The browser
only talks to one origin: `https://<domain>/` is the dashboard and
`https://<domain>/api/*` is the API (including the `/api/ws/prices` WebSocket).

1. Get a Linux VPS (2 vCPU / 4 GB RAM minimum; the worker runs headless
   Chromium) with Docker + the compose plugin, and open ports 80 and 443.
2. Point DNS `A` records for `<domain>` and `www.<domain>` at the server.
3. On the server:

   ```bash
   git clone <repo> && cd <repo>
   cp .env.production.example .env.production
   # set DOMAIN, SECRET_KEY, POSTGRES_PASSWORD, S3_SECRET_KEY (openssl rand -hex 32)
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

4. Check `https://<domain>/api/health/live` and open `https://<domain>`.

Notes:

- The API refuses to start with `ENVIRONMENT=production` unless `SECRET_KEY` is
  32+ characters, so the default key can't ship by accident.
- `VITE_API_BASE_URL` is baked into the web bundle (`https://<domain>/api`);
  changing `DOMAIN` requires `docker compose ... build web`.
- Update: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
  (migrations run automatically via the `migrate` service).
- Back up the `pgdata` and `miniodata` volumes. Only Caddy publishes ports.
- `apps/web/public/robots.txt` allows indexing; add a `Sitemap:` line once the domain is live.

## Production shape (Kubernetes)

`infra/k8s/` has example manifests for a Kubernetes deployment: separate
Deployments for `api`, `worker`, and `beat` (beat must stay at
`replicas: 1` — running two schedulers double-enqueues every job), a
`web` Deployment serving the static build behind nginx, and HPAs for `api`
and `worker` scaling on CPU. `infra/nginx/nginx.conf` is an example edge
proxy that terminates TLS and routes `/api/*` to the api service and
everything else to `web`.

Postgres, Redis, and object storage are expected to be managed services in
production (RDS/Cloud SQL, ElastiCache/MemoryStore, S3/GCS) — the
docker-compose Postgres/Redis/MinIO containers are for local dev only, not
referenced by the k8s manifests.

## Required environment

See [.env.example](../.env.example) for the full list. The ones that must
change from their defaults before a real deployment:

- `SECRET_KEY` — JWT signing key
- `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `S3_*` — pointed at a real bucket, not MinIO
- `ANTHROPIC_API_KEY` — AI scoring is skipped (falls back to the
  similarity-based score) if this is blank, so it's not strictly required,
  but change summaries will be generic without it.

## Build versioning

`GET /health/build` reads `BUILD_VERSION`/`BUILD_COMMIT` env vars — set
these from CI (`.github/workflows`) when building images so the running
version is visible without shelling into a container.

## Database migrations in CI/CD

`alembic -c migrations/alembic.ini upgrade head` should run as a release
step before the new `api`/`worker` images roll out, using the same
`DATABASE_URL` they'll run with. `migrations/env.py` builds its own sync
connection from `DATABASE_URL` regardless of the `+asyncpg` driver the api
uses at runtime.
