FROM python:3.12-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt apps/api/requirements.txt
RUN pip install --no-cache-dir -r apps/api/requirements.txt

COPY packages packages
COPY migrations migrations
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV PYTHONPATH=/app:/app/apps/api

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS dev
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
