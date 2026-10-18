"""Structured JSON logging shared by the api and worker services."""
from __future__ import annotations

import json
import logging
import sys
import time
from typing import Any


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        extra = getattr(record, "extra_fields", None)
        if extra:
            payload.update(extra)

        return json.dumps(payload, default=str)


def configure_logging(service: str, level: str = "INFO") -> None:
    """Configure root logging to emit single-line JSON to stdout.

    Call once at process start (api startup, worker init, beat init).
    """
    root = logging.getLogger()
    root.setLevel(level.upper())
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)

    logging.getLogger(service).info("logging configured", extra={"extra_fields": {"service": service}})


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
