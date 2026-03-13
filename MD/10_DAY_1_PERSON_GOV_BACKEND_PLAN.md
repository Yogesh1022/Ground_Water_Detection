# AquaVidarbha — 10-Day, 1-Developer Plan (Gov Officer Dashboard Backend Only)

> **Owner:** 1 full-stack backend developer (Go + PostgreSQL + Redis + Python gRPC integration)
>
> **Goal in 10 days:** Ship a production-ready backend for the **Government Officer Dashboard** only.
>
> **Focus:** Build gov-scoped APIs for citizen request management, district analytics, AI forecast access, tanker scheduling, task assignment, report generation, and activity logging.

---

## Scope (Gov Officer Backend Only)

This plan covers API and backend logic required for:

- Gov authentication and role checks (`gov`)
- Command Center KPIs (open requests, in-progress, resolved, critical zones, active tankers)
- Citizen request management (view all, assign officer, resolve, escalate)
- District analytics (water level per district, crisis index, trend)
- 90-day AI forecasts with confidence band
- Crisis zone predictions table
- Task assignment to field teams + team workload
- Tanker scheduling (route list, create/update)
- PDF/CSV report generation (monthly status, AI prediction summary, citizen requests)
- Activity/event log

Out of scope for this 10-day track:

- Citizen dashboard APIs (self-register, predict for self, track own complaint)
- Admin dashboard APIs (CRUD users, ML model retrain, system settings)
- WebSocket real-time alert streaming
- Admin audit log (gov has read-only activity log only)

---

## Delivery Strategy

Use the same strict three-layer approach as the admin plan:

- `repository` — SQL and persistence
- `service` — business logic, validations, gRPC orchestration
- `handler` — HTTP input/output, role gating

Quality bar:

- Every write endpoint logs to `audit_log`
- Every gov endpoint requires JWT + `role=gov`
- Core endpoints have handler + service tests
- Dockerized and runnable with one command
- Shared DB schema and middleware with admin plan — no duplication

---

## Day-by-Day Plan

---

## Day 1 — Bootstrap, Config, and Gov Auth Foundation

### Objectives

- Confirm shared infrastructure (DB, Redis, config, middleware) is in place
- Implement secure gov login and claim-based role gating
- Register gov route group in router

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Confirm/update config loader and startup wiring | `cmd/server/main.go`, `internal/config/config.go` | ☐ |
| 2 | Confirm Docker stack (PostgreSQL + Redis) is healthy | `docker-compose.yml` | ☐ |
| 3 | Confirm shared middleware chain: logger, recovery, CORS, request ID | `internal/middleware/*.go` | ☐ |
| 4 | Confirm JWT auth middleware with `role` claim extraction | `internal/middleware/auth.go` | ☐ |
| 5 | Add `RequireRole("gov")` and `RequireAnyRole("gov","admin")` guards | `internal/middleware/auth.go` | ☐ |
| 6 | Confirm auth service login flow returns JWT with `role=gov` | `internal/service/auth.go` | ☐ |
| 7 | Register gov route group under `/api/v1/gov` with auth + role middleware | `internal/handler/router.go` | ☐ |
| 8 | Test: `POST /api/v1/auth/login` with gov credentials → JWT with `role=gov` | — | ☐ |

### End-of-Day Verify

- Server starts cleanly
- Gov login returns JWT with `role=gov`
- Hitting `/api/v1/gov/*` without token or with `role=citizen` returns `403 Forbidden`

---

## Day 2 — DB Schema for Gov Domain + Repositories

### Objectives

- Ensure schema supports all gov dashboard features
- Implement foundational repositories needed by gov service layer

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run/verify migrations: users, complaints, alerts, tanker_routes, task_assignments, audit_log, district_stats | `migrations/*.sql` | ☐ |
| 2 | Add query-path indexes: `complaints(status)`, `complaints(assigned_officer_id)`, `complaints(district)`, `task_assignments(assignee_officer_id)`, `tanker_routes(status)` | `migrations/*.sql` | ☐ |
| 3 | Implement complaint repository: `GetAll` (filtered/paginated by status, district, severity), `GetByID`, `UpdateStatus`, `AssignOfficer`, `Escalate`, `GetStats` | `internal/repository/complaint_repo.go` | ☐ |
| 4 | Implement alert repository: `GetAll` (by district, type), `GetActive`, `GetByArea` | `internal/repository/alert_repo.go` | ☐ |
| 5 | Implement tanker repository: `GetAll`, `GetByStatus`, `Create`, `Update` | `internal/repository/tanker_repo.go` | ☐ |
| 6 | Implement task assignment repository: `Create`, `GetByComplaint`, `GetByAssignee`, `UpdateStatus`, `GetWorkloadStats` | `internal/repository/task_repo.go` | ☐ |
| 7 | Implement district repository: `GetAll` (with aggregates), `GetByName`, `GetCrisisIndex` | `internal/repository/district_repo.go` | ☐ |

### End-of-Day Verify

- Migrations run cleanly
- Complaint repo: `GetAll` with `status=open` filter returns correct rows
- Task repo: `GetWorkloadStats` returns per-officer counts

---

## Day 3 — Audit Middleware, Gov Shared Services, Router

### Objectives

- Wire audit logging for all gov writes
- Set up shared prediction + district cache services
- Define full gov route structure

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add request ID middleware (UUID per request, injected into logs and response header) | `internal/middleware/requestid.go` | ☐ |
| 2 | Add audit middleware: capture actor_id, actor_role, action, target, IP on every `POST/PUT/DELETE` under gov group | `internal/middleware/audit.go` | ☐ |
| 3 | Add standard response/error envelope (`pkg/response/response.go`) | `pkg/response/response.go` | ☐ |
| 4 | Add validation helpers: pagination defaults, enum validators (status, severity, priority) | `pkg/validator/validator.go` | ☐ |
| 5 | Define all gov routes in router with correct middleware chain | `internal/handler/router.go` | ☐ |
| 6 | Add Redis cache wrapper (`Get`, `Set`, `Delete`, TTL) | `internal/cache/redis.go` | ☐ |
| 7 | Write cache service for district stats: key=`district:{name}:stats`, TTL=15min | `internal/service/district.go` | ☐ |
| 8 | Add tests: JWT guard, role guard, audit row creation on write | `internal/middleware/*_test.go` | ☐ |

### End-of-Day Verify

- Any `PUT /api/v1/gov/requests/:id/assign` call writes an `audit_log` row
- District stats are served from Redis cache on second request

---

## Day 4 — Gov Overview KPIs + Complaint Request Management

### Objectives

- Deliver the Command Center stat cards
- Deliver the full citizen requests table with filter + pagination

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement gov overview service: aggregate open/in-review/in-progress/resolved counts, critical zones count, active tanker count | `internal/service/gov_service.go` | ☐ |
| 2 | Add `GET /api/v1/gov/overview` — returns 5 KPI stat cards | `internal/handler/gov.go` | ☐ |
| 3 | Implement complaint list service: filter by status (`all`/`open`/`in_review`/`critical`/`resolved`), district, severity; paginated | `internal/service/gov_service.go` | ☐ |
| 4 | Add `GET /api/v1/gov/requests` — paginated table with filter pills (status, district) | `internal/handler/gov.go` | ☐ |
| 5 | Add `PUT /api/v1/gov/requests/:id/assign` — set `assigned_officer_id`, status → `in_review`; audit-logged | `internal/handler/gov.go` | ☐ |
| 6 | Add `PUT /api/v1/gov/requests/:id/resolve` — set status → `resolved`, `resolved_at`; audit-logged | `internal/handler/gov.go` | ☐ |
| 7 | Add `PUT /api/v1/gov/requests/:id/escalate` — set status → `escalated`, add escalation note; audit-logged | `internal/handler/gov.go` | ☐ |
| 8 | Add service-level validation: cannot assign to non-existent officer, cannot resolve already-escalated complaint | `internal/service/gov_service.go` | ☐ |

### End-of-Day Verify

```bash
GET  /api/v1/gov/overview           # → {"open":42,"in_progress":18,"resolved":310,...}
GET  /api/v1/gov/requests?status=open&page=1&limit=20
PUT  /api/v1/gov/requests/5/assign  # body: {"officer_id":12}
PUT  /api/v1/gov/requests/5/resolve
PUT  /api/v1/gov/requests/5/escalate
```

---

## Day 5 — District Analytics

### Objectives

- Deliver the District Analytics section (bar chart + scatter chart data)

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement district analytics service: per-district GW depth, depth change vs last quarter, well count, risk status (SAFE/MODERATE/WARNING/DANGER), crisis index (0–100) | `internal/service/district.go` | ☐ |
| 2 | Add `GET /api/v1/gov/districts/analytics` — list of 11 Vidarbha districts with all fields for bar + scatter charts | `internal/handler/gov.go` | ☐ |
| 3 | Implement materialized view refresh trigger for `district_stats` (call after new prediction or reading import) | `internal/service/district.go` | ☐ |
| 4 | Cache district analytics: key=`gov:district:analytics`, TTL=15min, invalidate on bulk import | `internal/service/district.go` | ☐ |
| 5 | Add `GET /api/v1/gov/alerts` — return district-filtered alerts (critical/warning/info/success) with confidence, source, timestamp | `internal/handler/gov.go` | ☐ |
| 6 | Add handler + service tests for district analytics aggregation | `internal/handler/gov_test.go`, `internal/service/district_test.go` | ☐ |

### End-of-Day Verify

```bash
GET /api/v1/gov/districts/analytics
# → [{district:"Nagpur", depth_mbgl:38.2, change:-2.1, risk:"MODERATE", crisis_index:44}, ...]
GET /api/v1/gov/alerts?district=Nagpur
```

---

## Day 6 — AI Forecasts + Crisis Zone Predictions

### Objectives

- Power the "AI Forecasts" section of the gov dashboard
- Wire gRPC call to ML service for 90-day outlook

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement gRPC client method `Predict()` and `ModelStatus()` with keepalive, 5s timeout, graceful fallback | `internal/grpcclient/ml_client.go` | ☐ |
| 2 | Implement forecast service: call ML gRPC for each district centroid, aggregate 90-day (3×30-day months) depth+confidence forecast | `internal/service/forecast_service.go` | ☐ |
| 3 | Add `GET /api/v1/gov/forecast` — returns time-series with upper/lower confidence band (drives "90-Day AI Forecast" line chart) | `internal/handler/gov.go` | ☐ |
| 4 | Implement crisis zone detection: query districts where forecasted depth > DANGER threshold (configurable via system_settings); include current vs predicted depth, confidence %, recommended actions | `internal/service/forecast_service.go` | ☐ |
| 5 | Add `GET /api/v1/gov/crisis-zones` — list of predicted crisis districts with all columns for the crisis table | `internal/handler/gov.go` | ☐ |
| 6 | Cache forecast result: key=`gov:forecast:{district}:{month}:{year}`, TTL=1hr | `internal/service/forecast_service.go` | ☐ |
| 7 | Add timeout/fallback: if gRPC call fails, return last cached forecast with `stale:true` flag in response | `internal/service/forecast_service.go` | ☐ |

### End-of-Day Verify

```bash
GET /api/v1/gov/forecast
# → {"months":[{"label":"Apr 2026","depth_mbgl":41.2,"upper":45.0,"lower":37.4},...]}
GET /api/v1/gov/crisis-zones
# → [{"district":"Wardha","current":52.1,"predicted":68.4,"confidence":0.83,...}]
```

---

## Day 7 — Task Assignment + Team Workload

### Objectives

- Complete the "Task Assignment" and team workload pages

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement task service: create task linked to complaint + officer, validate officer exists and is active | `internal/service/task_service.go` | ☐ |
| 2 | Add `POST /api/v1/gov/tasks` — body: `{complaint_id, assignee_officer_id, due_date, priority, notes}` → audit-logged | `internal/handler/gov_task.go` | ☐ |
| 3 | Add `GET /api/v1/gov/tasks` — list all tasks with filters (assignee, status, priority, due_date range) | `internal/handler/gov_task.go` | ☐ |
| 4 | Add `PUT /api/v1/gov/tasks/:id/status` — update task status (`pending`/`in_progress`/`completed`) | `internal/handler/gov_task.go` | ☐ |
| 5 | Implement workload aggregation: per-officer active task count, completed task count (for chart) | `internal/service/task_service.go` | ☐ |
| 6 | Add `GET /api/v1/gov/teams/workload` — per-officer name + active + completed counts (drives gov workload bar chart) | `internal/handler/gov_task.go` | ☐ |
| 7 | Add handler + service tests for task creation and workload aggregation | `internal/handler/gov_task_test.go` | ☐ |

### End-of-Day Verify

```bash
POST /api/v1/gov/tasks              # body: {complaint_id:5, assignee_officer_id:12, due_date:"2026-03-20", priority:"high"}
GET  /api/v1/gov/tasks?assignee=12
GET  /api/v1/gov/teams/workload
# → [{"officer":"Ramesh Patil","active":7,"completed":43}]
```

---

## Day 8 — Tanker Scheduling + Activity Log

### Objectives

- Complete the Tanker Schedule section
- Deliver the Activity Log table

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement tanker service: list, create, update routes | `internal/service/tanker_service.go` | ☐ |
| 2 | Add `GET /api/v1/gov/tankers` — active tanker routes: route name, villages, schedule, capacity, status, assigned driver | `internal/handler/gov_tanker.go` | ☐ |
| 3 | Add `POST /api/v1/gov/tankers` — create new tanker route (villages as array, schedule, capacity_liters, assigned_driver); audit-logged | `internal/handler/gov_tanker.go` | ☐ |
| 4 | Add `PUT /api/v1/gov/tankers/:id` — update tanker route details/status; audit-logged | `internal/handler/gov_tanker.go` | ☐ |
| 5 | Add `DELETE /api/v1/gov/tankers/:id` — deactivate (soft-delete via status=inactive); audit-logged | `internal/handler/gov_tanker.go` | ☐ |
| 6 | Implement activity log service: query `audit_log` filtered by gov actor_role, paginated, date range | `internal/service/gov_service.go` | ☐ |
| 7 | Add `GET /api/v1/gov/activity-log` — timestamped events: predictions, request assignments, tanker updates, task creations (drives gov "Activity Log" table) | `internal/handler/gov_activity.go` | ☐ |
| 8 | Add handler tests for tanker CRUD and activity log pagination | `internal/handler/gov_tanker_test.go` | ☐ |

### End-of-Day Verify

```bash
GET  /api/v1/gov/tankers
POST /api/v1/gov/tankers            # body: {route_name:"Wardha-North", villages:["Pulgaon","Hinganghat"], ...}
PUT  /api/v1/gov/tankers/3
GET  /api/v1/gov/activity-log?page=1&from=2026-03-01
```

---

## Day 9 — Report Generation + Hardening

### Objectives

- Ship the "Generate Reports" section (PDF/CSV)
- Harden existing endpoints for production

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement report data assembler: aggregate complaints, district stats, forecast for a given month/district | `internal/service/report_service.go` | ☐ |
| 2 | Add `GET /api/v1/gov/reports/monthly-status` — generate monthly groundwater status PDF (use `gofpdf` or equivalent); filename in `Content-Disposition` | `internal/handler/gov_reports.go` | ☐ |
| 3 | Add `GET /api/v1/gov/reports/ai-prediction` — generate AI prediction summary PDF with per-district risk table | `internal/handler/gov_reports.go` | ☐ |
| 4 | Add `GET /api/v1/gov/reports/citizen-requests` — export all citizen requests as CSV (`text/csv` response) | `internal/handler/gov_reports.go` | ☐ |
| 5 | Add pagination and query limits to all list endpoints (default 20, max 100) | `internal/handler/*.go` | ☐ |
| 6 | Add DB index review for complaint and task query paths | `migrations/*.sql` | ☐ |
| 7 | Security audit checklist: role guards on every gov route, no raw SQL injection vectors, bcrypt cost=12 | — | ☐ |
| 8 | Add smoke test script for all gov endpoints | `scripts/gov_smoke_test.sh` | ☐ |

### End-of-Day Verify

```bash
GET /api/v1/gov/reports/monthly-status      # → downloads PDF
GET /api/v1/gov/reports/ai-prediction       # → downloads PDF
GET /api/v1/gov/reports/citizen-requests    # → downloads CSV
```
All gov list endpoints respect `page` and `limit` query params.

---

## Day 10 — Docker, Final QA, and Release

### Objectives

- Freeze and ship backend for gov dashboard integration

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Finalize Dockerfiles and compose for backend + db + redis | `Dockerfile`, `docker-compose.yml` | ☐ |
| 2 | Run end-to-end gov smoke tests against full running stack | `scripts/gov_smoke_test.sh` | ☐ |
| 3 | Run `go test ./... -cover` — target >75% coverage for gov package | — | ☐ |
| 4 | Produce endpoint docs with request/response examples for all gov routes | `README.md` | ☐ |
| 5 | Confirm admin + gov route groups coexist without conflict | `internal/handler/router.go` | ☐ |
| 6 | Tag release candidate; write release notes | `CHANGELOG.md` | ☐ |
| 7 | Buffer for bug fixes from frontend wiring of `dashboard-gov.html` | relevant files | ☐ |

### End-of-Day Verify (Ship Criteria)

- All P0 gov endpoints return correct data with `gov` JWT
- All write actions are audit-logged
- Reports download correctly as PDF/CSV
- Docker startup is reproducible in one command
- No route conflicts with admin backend

---

## Gov Officer API Checklist (Must Be Available by Day 10)

| Method | Endpoint | Priority | Dashboard Section |
|--------|----------|----------|-------------------|
| POST | `/api/v1/auth/login` | P0 | Login page |
| GET | `/api/v1/gov/overview` | P0 | Command Center stat cards |
| GET | `/api/v1/gov/requests` | P0 | All Requests table |
| PUT | `/api/v1/gov/requests/:id/assign` | P0 | Assign officer |
| PUT | `/api/v1/gov/requests/:id/resolve` | P0 | Resolve request |
| PUT | `/api/v1/gov/requests/:id/escalate` | P1 | Escalate to DC |
| GET | `/api/v1/gov/districts/analytics` | P0 | District Analytics charts |
| GET | `/api/v1/gov/alerts` | P0 | Alert feed |
| GET | `/api/v1/gov/forecast` | P0 | 90-Day AI Forecast chart |
| GET | `/api/v1/gov/crisis-zones` | P0 | Crisis Zones table |
| POST | `/api/v1/gov/tasks` | P0 | Task Assignment form |
| GET | `/api/v1/gov/tasks` | P1 | Task list view |
| PUT | `/api/v1/gov/tasks/:id/status` | P1 | Update task status |
| GET | `/api/v1/gov/teams/workload` | P0 | Team Workload chart |
| GET | `/api/v1/gov/tankers` | P0 | Tanker Schedule table |
| POST | `/api/v1/gov/tankers` | P0 | Create tanker route |
| PUT | `/api/v1/gov/tankers/:id` | P1 | Update tanker route |
| DELETE | `/api/v1/gov/tankers/:id` | P2 | Deactivate route |
| GET | `/api/v1/gov/activity-log` | P0 | Activity Log table |
| GET | `/api/v1/gov/reports/monthly-status` | P0 | Generate Reports |
| GET | `/api/v1/gov/reports/ai-prediction` | P1 | Generate Reports |
| GET | `/api/v1/gov/reports/citizen-requests` | P0 | Generate Reports (CSV) |

Priority legend:

- `P0`: mandatory for dashboard go-live
- `P1`: important, should ship in v1
- `P2`: optional if time permits

---

## Merge Readiness Checklist (Before Combining with Admin + User Backends)

When all three backends are independently done, the merge protocol is:

| Check | What to Verify |
|-------|----------------|
| DB schema | Same migration files — all three devs ran identical `migrations/*.sql` |
| JWT claims | Same `role` values (`citizen`/`gov`/`admin`) and same JWT secret env var |
| Route groups | `/api/v1/auth/*` shared, `/api/v1/gov/*` gov-only, `/api/v1/admin/*` admin-only, `/api/v1/*` public |
| Middleware | `Auth()` + `RequireRole()` middleware from same source files — no duplicates |
| Audit log | All write operations across all three backends write to same `audit_log` table |
| Response envelope | All handlers use same `pkg/response` package |
| Package names | `handler/gov`, `service/gov`, `repository` — no naming collisions with admin or user packages |

---

## Risk Controls for Solo Execution

| Risk | Mitigation |
|------|------------|
| gRPC ML service not ready | Implement `forecast_service.go` with a mock fallback first; swap in real gRPC on Day 6 |
| Report generation complexity | Prioritize CSV export first (Day 9); PDF is P1, fallback to stub if time runs out |
| Complaint state machine conflicts | Lock status transitions in service layer (Day 4) before writing handlers |
| DB query performance on complaints table | Add composite indexes on Day 2 before writing any `GetAll` queries |
| Merge conflicts with admin backend | Use distinct package paths (`handler/gov_*.go`, `service/gov_*.go`) from Day 1 |

---

## Definition of Done

Gov backend is done when:

- All P0 endpoints return correct data with `gov` JWT
- All write actions are audit-logged with actor_id, IP, and action detail
- Forecast returns 90-day outlook for all 11 Vidarbha districts
- Tanker and task CRUD is functional
- Reports download as valid PDF and CSV files
- Backend runs with Docker and can be consumed by `frontend/v2/dashboard-gov.html`
