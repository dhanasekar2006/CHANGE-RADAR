# API

FastAPI serves interactive docs at `/docs` (Swagger UI) and `/redoc` when
running. This file covers the shape that isn't obvious from the schema
alone.

## Auth

- `POST /auth/register` — creates a user *and* an owned workspace in one call,
  returns a token pair.
- `POST /auth/login` / `POST /auth/refresh` — return `{access_token,
  refresh_token, token_type}`.
- `POST /auth/password-reset/request` / `/confirm` — always responds success
  on `/request` regardless of whether the email exists, to avoid leaking
  registered accounts.
- Every other route requires `Authorization: Bearer <access_token>`.

## Workspace scoping

Every resource route is nested under `/workspaces/{workspace_id}/...`. Routers
resolve the caller's `WorkspaceMember` row first (404 if they're not a
member) and then check role via `security/rbac.py`:

| Action                          | Minimum role |
|----------------------------------|--------------|
| Read anything                    | viewer       |
| Create/update/pause/resume monitor | member     |
| Delete monitor, manage channels  | admin        |
| Update workspace, manage members | admin        |

## Errors

All errors are `packages/shared/errors.py::ChangeRadarError` subclasses,
serialized by `middleware/error_handler.py` as:

```json
{ "code": "not_found", "message": "monitor not found", "request_id": "..." }
```

`request_id` matches the `X-Request-ID` response header (echoed from the
request if the client sent one, generated otherwise) — include it when
reporting a bug.

## Rate limiting

`middleware/rate_limit.py` enforces a fixed-window per-IP limit (120
req/min by default) backed by Redis, and fails open if Redis is unreachable.

## Pagination

List endpoints that can grow unbounded (currently just `GET
/workspaces/{id}/changes`) return `{items, total, limit, offset}` and accept
`?limit=&offset=` query params (`limit` capped at 100).

## Triggering a check manually

`POST /workspaces/{id}/monitors/{monitor_id}/run-now` brings the monitor's
`next_check_at` forward and enqueues `check_monitor` directly — it doesn't
wait for the next beat tick.
