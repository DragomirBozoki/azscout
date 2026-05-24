# Decision Log

- 2026-05-23: Used a dedicated Python 3.11 virtual environment at `backend/.venv311` because the existing root `.venv` is Python 3.10 and incompatible with the backend target (`>=3.11`).
- 2026-05-23: Kept `Base.metadata.create_all()` on startup for MVP convenience, while also adding Alembic migration files as the canonical schema path.
- 2026-05-23: Preserved Cost Management 401/403 behavior from POC by completing scans with zeroed cost data and persisting a warning in `scans.error_message`.
- 2026-05-23: In `frontend/`, the `shadcn` CLI was partially interactive in this terminal environment and did not complete non-interactively; I implemented the same minimal primitives manually (`button`, `dropdown-menu`, `tooltip`, `skeleton`, `dialog`, `sonner`) with Radix dependencies to preserve the required component scope.
- 2026-05-23: cost_available in /api/stats/overview is currently approximated as 	otal_cost > 0 (as requested), so zero-cost subscriptions can appear as cost role pending until we add an explicit backend flag in a future phase.
- 2026-05-23: In the insight dialog role-assignment commands, subscriptionId is prefilled from the selected subscription, while userPrincipalName remains a placeholder ({userPrincipalName}) because the browser session has no reliable source of the signed-in Azure principal.
- 2026-05-24: For Dockerized frontend, API base is configurable via VITE_API_BASE_URL (default /api) so nginx same-origin proxy works without CORS in compose.
- 2026-05-24: Docker runtime smoke tests could not be executed in this environment because Docker Desktop/Engine was not running (//./pipe/dockerDesktopLinuxEngine not found). Files are prepared and docker compose config was used for static validation.
