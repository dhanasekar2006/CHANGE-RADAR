import sys
from pathlib import Path

# Repo root (four levels up: tests -> api -> apps -> repo root) must be on
# sys.path so `packages.core` / `packages.shared` imports resolve the same
# way they do inside the Docker image (WORKDIR /app, PYTHONPATH=/app).
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
