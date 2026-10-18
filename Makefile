# Host-run targets (api, worker, beat, web, migrate, seed) read .env.local, which
# points at localhost instead of Docker service names. See .env.local.example.
ifneq (,$(wildcard .env.local))
include .env.local
export
endif

.PHONY: install install-api install-worker install-web \
        api worker beat web \
        migrate migrate-new \
        test test-api test-worker test-e2e \
        lint fmt \
        up down logs seed infra

install: install-api install-worker install-web

install-api:
	cd apps/api && pip install -r requirements.txt

install-worker:
	cd apps/worker && pip install -r requirements.txt

install-web:
	cd apps/web && npm install

api:
	cd apps/api && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

worker:
	cd apps/worker && celery -A src.celery_app worker --loglevel=info

beat:
	cd apps/worker && celery -A src.celery_app beat --loglevel=info

web:
	cd apps/web && npm run dev

migrate:
	alembic -c migrations/alembic.ini upgrade head

migrate-new:
	alembic -c migrations/alembic.ini revision --autogenerate -m "$(m)"

test: test-api test-worker

test-api:
	cd apps/api && pytest

test-worker:
	cd apps/worker && pytest

test-e2e:
	cd tests/e2e && npx playwright test

lint:
	ruff check apps/api apps/worker packages
	cd apps/web && npm run lint

fmt:
	ruff format apps/api apps/worker packages
	cd apps/web && npm run format

# Backing services only (postgres, redis, minio) for running the apps on the host.
infra:
	docker compose up -d postgres redis minio

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	python scripts/seed_db.py
