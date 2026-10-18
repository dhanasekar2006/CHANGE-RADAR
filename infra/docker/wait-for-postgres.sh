#!/usr/bin/env sh
# Blocks until Postgres accepts connections, then execs the given command.
# Used as an entrypoint wrapper for api/worker in environments (e.g. k8s
# without initContainers) where docker-compose's `depends_on: condition:
# service_healthy` isn't available.
set -e

host="${POSTGRES_HOST:-postgres}"
port="${POSTGRES_PORT:-5432}"

until nc -z "$host" "$port"; do
  echo "waiting for postgres at $host:$port..."
  sleep 1
done

exec "$@"
