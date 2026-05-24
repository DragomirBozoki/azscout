#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] running alembic upgrade head"
alembic upgrade head

echo "[entrypoint] starting uvicorn on :8000"
exec uvicorn azscout.main:app --host 0.0.0.0 --port 8000