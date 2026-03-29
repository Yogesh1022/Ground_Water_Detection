# Govn Dashboard Backend Roadmap (0 to Production)

## 1) Objective
Build a complete backend for the Government Officer dashboard (`frontend/v2/dashboard-gov.html`) using the same architecture style as `common_user`:
**model → validator → repository → service → handler → routes → tests**.

---

## 2) API Surface (mapped to UI pages)

### Auth/Profile
- `GET /api/v1/govn/me`

### Command Center (Overview)
- `GET /api/v1/govn/overview/kpis`
- `GET /api/v1/govn/overview/requests-by-category`
- `GET /api/v1/govn/overview/crisis-index`
- `GET /api/v1/govn/overview/priority-requests?limit=10`
- `GET /api/v1/govn/overview/recent-activity?limit=20`

### All Requests
- `GET /api/v1/govn/requests?page=1&limit=20&status=&district=&priority=&q=&from=&to=`
- `GET /api/v1/govn/requests/:requestId`
- `PATCH /api/v1/govn/requests/:requestId/status`
- `POST /api/v1/govn/requests/:requestId/assign`
- `POST /api/v1/govn/requests/:requestId/escalate`
- `POST /api/v1/govn/requests/:requestId/resolve`
- `GET /api/v1/govn/requests/export?format=csv|pdf&status=&district=&from=&to=`

### District Analytics
- `GET /api/v1/govn/analytics/districts/groundwater`
- `GET /api/v1/govn/analytics/districts/rainfall-vs-depth`
- `GET /api/v1/govn/analytics/districts/summary`

### AI Forecasts
- `GET /api/v1/govn/forecast/90day?district=`
- `GET /api/v1/govn/forecast/shap?district=`
- `GET /api/v1/govn/forecast/crisis-zones?window=90`

### Task Assignment
- `POST /api/v1/govn/tasks`
- `PATCH /api/v1/govn/tasks/:taskId/reassign`
- `GET /api/v1/govn/tasks?status=&assignee=&priority=&page=&limit=`
- `GET /api/v1/govn/teams/workload`

### Tanker Schedule
- `GET /api/v1/govn/tankers/routes?date=&district=&status=`
- `POST /api/v1/govn/tankers/routes`
- `PATCH /api/v1/govn/tankers/routes/:routeId`
- `PATCH /api/v1/govn/tankers/routes/:routeId/status`

### Reports
- `POST /api/v1/govn/reports/monthly-status`
- `POST /api/v1/govn/reports/ai-prediction`
- `POST /api/v1/govn/reports/citizen-requests`
- `GET /api/v1/govn/reports/:jobId`
- `GET /api/v1/govn/reports/:jobId/download`

### Activity Log
- `GET /api/v1/govn/activity-logs?page=&limit=&actor=&action=&from=&to=`

---

## 3) File-by-File Build Plan

## Phase A — Foundation

### A1. App bootstrap
- `backend/cmd/api/main.go`
- `backend/internal/config/config.go`
- `backend/internal/server/http.go`
- `backend/internal/database/postgres.go`
- `backend/internal/database/redis.go` *(optional but recommended for cache/jobs)*

### A2. Shared utilities
- `backend/internal/response/response.go` *(uniform success/error payloads)*
- `backend/internal/errors/app_error.go`
- `backend/internal/logger/logger.go`
- `backend/internal/utils/pagination.go`
- `backend/internal/utils/time.go`

### A3. Middleware
- `backend/internal/middleware/auth_jwt.go`
- `backend/internal/middleware/rbac.go` *(role check: gov/admin)*
- `backend/internal/middleware/request_id.go`
- `backend/internal/middleware/recovery.go`
- `backend/internal/middleware/audit.go` *(write to activity logs)*

---

## Phase B — Database first (must be done before handlers)

### B1. Migrations
- `backend/migrations/0001_users.sql`
- `backend/migrations/0002_districts_villages.sql`
- `backend/migrations/0003_citizen_requests.sql`
- `backend/migrations/0004_request_status_history.sql`
- `backend/migrations/0005_tasks_assignments.sql`
- `backend/migrations/0006_tankers_routes.sql`
- `backend/migrations/0007_groundwater_metrics.sql`
- `backend/migrations/0008_forecasts.sql`
- `backend/migrations/0009_reports_jobs.sql`
- `backend/migrations/0010_activity_logs.sql`
- `backend/migrations/0011_indexes.sql`

### B2. Seed data
- `backend/seeds/dev_seed.sql` *(districts, users, requests, tasks, routes, forecasts)*

---

## Phase C — Govn module structure

Create:
- `backend/internal/dashboard/govn_user/model/`
- `backend/internal/dashboard/govn_user/validator/`
- `backend/internal/dashboard/govn_user/repository/`
- `backend/internal/dashboard/govn_user/service/`
- `backend/internal/dashboard/govn_user/handler/`

### C1. model/
- `types.go` *(domain structs)*
- `dto.go` *(response DTOs)*
- `query.go` *(filters/pagination structs)*
- `enums.go` *(status, priority, role constants)*

### C2. validator/
- `request_validator.go`
- `task_validator.go`
- `tanker_validator.go`
- `report_validator.go`

### C3. repository/
- `repository.go` *(interfaces)*
- `postgres_request_repo.go`
- `postgres_overview_repo.go`
- `postgres_analytics_repo.go`
- `postgres_forecast_repo.go`
- `postgres_task_repo.go`
- `postgres_tanker_repo.go`
- `postgres_report_repo.go`
- `postgres_activity_repo.go`

### C4. service/
- `service.go` *(constructor/wiring)*
- `overview_service.go`
- `request_service.go`
- `analytics_service.go`
- `forecast_service.go`
- `task_service.go`
- `tanker_service.go`
- `report_service.go`
- `activity_service.go`

### C5. handler/
- `routes.go`
- `overview_handler.go`
- `request_handler.go`
- `analytics_handler.go`
- `forecast_handler.go`
- `task_handler.go`
- `tanker_handler.go`
- `report_handler.go`
- `activity_handler.go`

---

## 4) Implementation Sequence (strict order)

1. **Auth + RBAC + district scope guards**
2. **Requests module** (list/detail/status/assign/escalate/resolve)
3. **Tasks module** (create/reassign/list/workload)
4. **Overview module** (KPIs/category/crisis/priority/recent)
5. **Analytics module** (groundwater/rainfall-vs-depth/summary)
6. **Forecast module** (90-day/shap/crisis-zones; read precomputed data)
7. **Tanker routes module** (CRUD + status)
8. **Reports module** (async creation + download)
9. **Activity logs module** (audit trail + filters)
10. **Hardening** (tests, rate limit, cache, docs, monitoring)

---

## 5) Update Existing Routes File

Current file:
- `backend/internal/dashboard/govn_user/handler/routes.go`

Action:
- Keep `/me`
- Add grouped routes for `overview`, `requests`, `analytics`, `forecast`, `tasks`, `tankers/routes`, `reports`, `activity-logs`
- Accept a `Handlers` struct so route wiring is clean and testable

---

## 6) Async Reports (Job architecture)

### Files
- `backend/internal/jobs/worker.go`
- `backend/internal/jobs/report_jobs.go`
- `backend/internal/storage/files.go`

### Flow
1. API creates `report_jobs` row (`status=queued`)
2. Job pushed to queue
3. Worker generates CSV/PDF
4. File stored and URL/path saved
5. `status=completed` or `failed`
6. Client polls `GET /reports/:jobId` then uses `/download`

---

## 7) Testing Plan

### Unit tests
- `.../service/*_test.go`
- `.../validator/*_test.go`

### Integration tests
- `.../repository/*_test.go` *(test DB)*

### Handler tests
- `.../handler/*_test.go` *(httptest + gin)*

### E2E
- `backend/tests/e2e/govn_dashboard_test.go`

### Mandatory scenarios
- RBAC blocks unauthorized role
- District scoping prevents cross-district access
- Request status transitions valid/invalid
- Assignment and escalation audit entries created
- Report job transitions queued → processing → completed

---

## 8) Security & Reliability Checklist

- JWT validation + role checks on all gov routes
- Input validation for all query/body params
- Pagination limits (avoid unbounded reads)
- Query indexes for `status`, `district_id`, `created_at`, `priority`
- Rate limiting on heavy endpoints/export/report
- Caching for overview and analytics endpoints
- Structured logs + request_id correlation
- Panic recovery and consistent error contracts

---

## 9) Suggested 4-Week Execution Plan

### Week 1
- Foundation + migrations + seed
- Auth/RBAC
- Requests APIs + tests

### Week 2
- Tasks/assignment
- Overview APIs
- Activity logging

### Week 3
- Analytics + Forecast + Tanker routes

### Week 4
- Reports async worker
- Full tests + OpenAPI docs + hardening + deployment checklist

---

## 10) Completion Criteria (Definition of Done)

- All listed endpoints implemented and documented
- Postman/Swagger collection complete
- Test suite green (unit + integration + handler + e2e)
- Performance acceptable on dashboard load endpoints
- Audit trail available for all mutating actions
- Production configs and migration scripts verified

---

## 11) Immediate Next Action

1. Implement `Handlers` struct and grouped route registration in:
   - `backend/internal/dashboard/govn_user/handler/routes.go`
2. Start module implementation with:
   - `request_validator.go`
   - `postgres_request_repo.go`
   - `request_service.go`
   - `request_handler.go`
3. Add tests for request list + status transition before moving to next module.