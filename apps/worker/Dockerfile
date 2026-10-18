FROM python:3.12-slim-bookworm AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    libpq-dev \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY apps/worker/requirements.txt apps/worker/requirements.txt
RUN pip install --no-cache-dir -r apps/worker/requirements.txt \
    && playwright install --with-deps chromium

COPY packages packages
COPY apps/worker apps/worker

WORKDIR /app/apps/worker
ENV PYTHONPATH=/app:/app/apps/worker

CMD ["celery", "-A", "src.celery_app", "worker", "--loglevel=info"]

FROM base AS dev
CMD ["celery", "-A", "src.celery_app", "worker", "--loglevel=debug"]
