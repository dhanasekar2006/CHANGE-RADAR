#!/usr/bin/env python
"""Runs a single monitor's check_monitor task synchronously, bypassing
Celery entirely. Useful for debugging a fetcher/extractor/differ without
needing the broker or a worker process running.

Usage: python scripts/run_once.py <monitor_id>
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "worker"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: python scripts/run_once.py <monitor_id>", file=sys.stderr)
        raise SystemExit(1)

    from src.tasks.check_monitor import check_monitor

    monitor_id = sys.argv[1]
    check_monitor.apply(args=[monitor_id])  # runs the task body inline, no broker needed
    print(f"ran check_monitor for {monitor_id}")


if __name__ == "__main__":
    main()
