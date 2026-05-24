# AzScout

Internal Azure FinOps tool that shows which resources cost the most relative to how much they are actually used.

It is an early-stage MVP being developed for the Comtrade AI team. The goal is a single dashboard where everyone in the team can see, in two minutes, whether anything is leaking money: forgotten VMs, unattached disks, stopped App Service plans, and oversized SKUs.

## Status

This is a working MVP. End-to-end inventory and scoring work today. Cost data and full activity metrics are pending RBAC role assignment on the production subscription.

What works:

- Resource inventory across one or more Azure subscriptions via Resource Graph
- Idle and orphaned detection for VMs, disks, public IPs, NICs, app services, and snapshots
- Scoreboard UI with filters, sorting, and per-resource history
- Self-service onboarding: paste a subscription ID, the app validates RBAC and starts scanning
- Background scans every 6 hours via APScheduler

What is pending validation:

- Cost data (requires Cost Management Reader)
- Full VM activity (requires Monitoring Reader)
- End-to-end demo on the real Comtrade AI subscription

## Screenshots

(Place screenshots in `docs/screenshots/` and reference them here. Use placeholder image paths now; real screenshots can be added after the first run with real data.)

![Scoreboard](docs/screenshots/scoreboard.png)

## Quick start (Docker)

Requirements: Docker Desktop and either an Azure CLI session on the host or a Service Principal.

1. Clone the repo.
2. Copy the env template:
   ```bash
   cp .env.docker.example .env.docker
   ```
3. Choose one auth path:
   - Azure CLI cache mount: run `az login` on the host. Compose mounts the host Azure CLI token directory into the backend container.
   - Service Principal: set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` in `.env.docker`.
4. Start the stack:
   ```bash
   docker compose up -d --build
   ```
5. Open `http://localhost:8080`. The setup wizard asks for a subscription ID on first run.

### Host Azure CLI path notes

- Linux/macOS default mount target in compose: `${HOME}/.azure`
- Windows default host path: `%USERPROFILE%\.azure`

For Windows PowerShell, set before running compose:

```powershell
$env:AZSCOUT_AZURE_DIR="$env:USERPROFILE/.azure"
docker compose up -d --build
```

If mounting Azure CLI cache is inconvenient, remove the mount and use Service Principal env vars in `.env.docker`.

## Quick start (local dev, no Docker)

Backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn azscout.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server is at `http://localhost:5173` and talks to backend API at `http://localhost:8000` by default.

## Permissions

AzScout uses `DefaultAzureCredential`, which falls back through env vars, managed identity, and `az login`. The credential needs these read-only roles on each subscription it monitors:

| Role | What it unlocks |
|---|---|
| Reader | Inventory (resource list, properties) - required minimum |
| Cost Management Reader | Cost per resource over a time window |
| Monitoring Reader | Activity metrics (CPU, request counts) for VMs and App Services |

To grant them to a user (or a Service Principal), see `docs/permissions.md`.

The tool is read-only. It does not stop, delete, or modify resources.

## How it scores resources

Each resource is checked against a set of rules:

- VMs: idle if average CPU is below the threshold for the metric window; critical if the VM is stopped but not deallocated.
- Managed disks: critical if unattached and costing money.
- Public IPs: critical if not attached to anything.
- App Service plans and sites: critical if the site is stopped while the plan is still billed; underused if request volume is very low.
- Snapshots: warn if older than 30 days and costing money.
- Network interfaces: warn if orphaned (no VM attached).

Thresholds live in `backend/azscout/config.py`. Everything else falls into the `unknown` bucket and is shown for completeness; it does not count toward flagged totals.

## Architecture

```text
                ┌───────────────┐
                │   Frontend    │
                │ React + Vite  │
                │     nginx     │
                └──────┬────────┘
                       │ /api → proxy
                ┌──────▼────────┐                ┌────────────────┐
                │    Backend    │                │     Azure      │
                │   FastAPI     │  ────────────► │ Resource Graph │
                │  APScheduler  │                │  Cost Mgmt API │
                │               │                │ Monitor / Logs │
                └──────┬────────┘                └────────────────┘
                       │
                ┌──────▼────────┐
                │    SQLite     │
                │  scans +      │
                │  snapshots    │
                └───────────────┘
```

## Roadmap

- [x] Phase 1: Backend scaffolding, scan runner, scheduler
- [x] Phase 2: Frontend scoreboard with filters and sorting
- [x] Phase 3: Multi-subscription support, setup wizard, manage page
- [x] Phase 3.5: Expand inventory coverage from 6 resource types to all
- [x] Dashboard header redesign, insight banner, role-aware empty states
- [ ] Pending: full validation on Comtrade AI subscription with cost roles granted
- [ ] Phase 4: Project and RG grouping in the scoreboard
- [ ] Phase 5: Email and Teams alerting on cost spikes
- [ ] Phase 6: Custom rules engine
- [ ] Phase 7: Authentication and per-user view

## License

Apache 2.0. See `LICENSE`.

## Contact

Dragomir Božoki - Comtrade SI, AI team. Internal questions: Slack or Teams.

This is currently a private repository. Do not redistribute without permission from Comtrade.
