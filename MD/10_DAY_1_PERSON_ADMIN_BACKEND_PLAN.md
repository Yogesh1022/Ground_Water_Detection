# AquaVidarbha - 10-Day, 1-Developer Plan (Admin Backend Only)

> **Owner:** 1 full-stack backend developer (Go + PostgreSQL + Redis + Python gRPC integration)
>
> **Goal in 10 days:** Ship a production-ready backend for the **Admin Dashboard** only.
>
> **Focus:** Build stable admin APIs, authentication/authorization, auditability, model status integration, and system settings.

---

## Scope (Admin Backend Only)

This plan covers API and backend logic required for:

- Admin authentication and role checks (`admin`)
- Admin overview KPIs
- Admin analytics
- System health
- Citizen management (list/edit/suspend/activate)
- Officer management (list/create/remove)
- Add user/officer flow
- ML model registry and retrain trigger
- Data source overview
- Full audit log with IP
- Settings read/update (thresholds, retrain frequency)
- Optional: well CSV import endpoint

Out of scope for this 10-day track:

- Citizen dashboard APIs
- Gov dashboard APIs
- WebSocket real-time updates
- Full report generation pipeline (PDF/CSV)

---

## Delivery Strategy

Use a strict three-layer approach:

- `repository` for SQL and persistence
- `service` for business logic and validations
- `handler` for HTTP input/output and role gating

Quality bar:

- Every write endpoint logs to `audit_log`
- Every admin endpoint requires JWT + `role=admin`
- Core endpoints have tests (handler + service)
- Dockerized and runnable with one command

---

## Day-by-Day Plan

## Day 1 - Bootstrap, Config, and Admin Auth Foundation

### Objectives

- Bring up backend runtime and dependencies
- Implement secure admin login and JWT plumbing
- Add middleware chain skeleton

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Initialize/update project config, env loader, and startup wiring | `cmd/server/main.go`, `internal/config/config.go` | ☐ |
| 2 | Setup DB + Redis local stack (Docker) and health checks | `docker-compose.yml` | ☐ |
| 3 | Implement logger + recovery + CORS middleware | `internal/middleware/logger.go`, `internal/middleware/recovery.go`, `internal/middleware/cors.go` | ☐ |
| 4 | Implement JWT auth middleware (extract/validate claims) | `internal/middleware/auth.go` | ☐ |
| 5 | Implement role middleware (`RequireRole("admin")`) | `internal/middleware/auth.go` | ☐ |
| 6 | Build auth service login flow (bcrypt verify + JWT issue) | `internal/service/auth.go` | ☐ |
| 7 | Add `POST /api/v1/auth/login` handler (admin login ready) | `internal/handler/auth.go` | ☐ |

### End-of-Day Verify

- Server starts
- `POST /api/v1/auth/login` returns JWT for admin credentials
- Accessing admin routes without token is blocked

---

## Day 2 - DB Schema for Admin Domain + Repositories

### Objectives

- Ensure schema supports all admin dashboard features
- Implement foundational repositories

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Finalize migrations for users, complaints, alerts, audit_log, system_settings, predictions | `migrations/*.sql` | ☐ |
| 2 | Add indexes for admin query paths (role, district, status, created_at) | `migrations/*.sql` | ☐ |
| 3 | Implement user repository (`GetAll`, `GetByID`, `Create`, `Update`, `SetActive`) | `internal/repository/user_repo.go` | ☐ |
| 4 | Implement complaint stats repo methods for admin KPIs/analytics | `internal/repository/complaint_repo.go` | ☐ |
| 5 | Implement prediction stats repo methods for model KPIs | `internal/repository/prediction_repo.go` | ☐ |
| 6 | Implement audit repository (`Create`, `GetAll` with filters/search) | `internal/repository/audit_repo.go` | ☐ |
| 7 | Implement settings repository (`Get`, `Update`) | `internal/repository/settings_repo.go` | ☐ |

### End-of-Day Verify

- Migrations run cleanly
- Repository unit tests or smoke checks pass for core CRUD/stat methods

---

## Day 3 - Admin Middleware, Request Tracing, and Audit Logging

### Objectives

- Secure all admin endpoints
- Guarantee traceability for write operations

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add request ID middleware for traceability | `internal/middleware/requestid.go` | ☐ |
| 2 | Add audit middleware for write endpoints (actor/action/target/IP/details) | `internal/middleware/audit.go` | ☐ |
| 3 | Define admin route group and middleware chain in router | `internal/handler/router.go` | ☐ |
| 4 | Add standard response/error envelope for consistency | `pkg/response/response.go` | ☐ |
| 5 | Add validation helpers for query/pagination/filter payloads | `pkg/validator/validator.go` | ☐ |
| 6 | Add tests for JWT, role checks, and audit logging | `internal/middleware/*_test.go` | ☐ |

### End-of-Day Verify

- Any `POST/PUT/DELETE` under admin path produces `audit_log` rows
- Invalid/expired tokens are rejected

---

## Day 4 - Admin Overview, Analytics, and Health APIs

### Objectives

- Deliver top dashboard sections for system-wide visibility

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement admin service aggregations for overview KPIs | `internal/service/admin_service.go` | ☐ |
| 2 | Add `GET /api/v1/admin/overview` | `internal/handler/admin.go` | ☐ |
| 3 | Implement trend and district-volume aggregations | `internal/service/admin_service.go` | ☐ |
| 4 | Add `GET /api/v1/admin/analytics` | `internal/handler/admin.go` | ☐ |
| 5 | Implement system health checks (DB, Redis, ML service reachability, API uptime) | `internal/service/health_service.go`, `internal/handler/admin_health.go` | ☐ |
| 6 | Add `GET /api/v1/admin/health` | `internal/handler/admin_health.go` | ☐ |

### End-of-Day Verify

- Admin dashboard KPI cards can be populated by API
- Health endpoint reports component status with clear states

---

## Day 5 - Citizen Management Endpoints

### Objectives

- Complete admin control over citizen accounts

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add list/search/filter/pagination service for citizens | `internal/service/admin_user_service.go` | ☐ |
| 2 | Add `GET /api/v1/admin/users` (search + district + pagination) | `internal/handler/admin.go` | ☐ |
| 3 | Add `PUT /api/v1/admin/users/:id` for profile edit | `internal/handler/admin.go` | ☐ |
| 4 | Add `PUT /api/v1/admin/users/:id/suspend` | `internal/handler/admin.go` | ☐ |
| 5 | Add `PUT /api/v1/admin/users/:id/activate` | `internal/handler/admin.go` | ☐ |
| 6 | Add robust validation and business rules (cannot suspend self, etc.) | `internal/service/admin_user_service.go` | ☐ |
| 7 | Add handler/service tests for all citizen management flows | `internal/handler/admin_test.go`, `internal/service/admin_user_service_test.go` | ☐ |

### End-of-Day Verify

- Admin can list/edit/suspend/activate citizens
- All write actions appear in `audit_log`

---

## Day 6 - Officer Management + Add User/Officer API

### Objectives

- Complete admin workflows for officer lifecycle

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/officers` (list/search/pagination) | `internal/handler/admin.go` | ☐ |
| 2 | Add `POST /api/v1/admin/users` (create citizen or officer by `account_type`) | `internal/handler/admin.go` | ☐ |
| 3 | Add `DELETE /api/v1/admin/officers/:id` with safety checks | `internal/handler/admin.go` | ☐ |
| 4 | Implement service rules for role-safe creation/removal | `internal/service/admin_user_service.go` | ☐ |
| 5 | Hash temp passwords securely and enforce minimum policy | `internal/service/auth.go` | ☐ |
| 6 | Add tests for create/remove officer cases and failures | `internal/handler/admin_test.go` | ☐ |

### End-of-Day Verify

- Admin can create officer accounts from dashboard form
- Admin can remove officer accounts safely

---

## Day 7 - ML Model Registry + Retrain Trigger

### Objectives

- Power the Admin ML Model Stats page

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement gRPC client method for `ModelStatus()` | `internal/grpcclient/ml_client.go` | ☐ |
| 2 | Add service adapter mapping gRPC response to admin DTOs | `internal/service/admin_ml_service.go` | ☐ |
| 3 | Add `GET /api/v1/admin/models` | `internal/handler/admin_ml.go` | ☐ |
| 4 | Implement retrain trigger contract (stub or real queue dispatch) | `internal/service/admin_ml_service.go` | ☐ |
| 5 | Add `POST /api/v1/admin/models/retrain` | `internal/handler/admin_ml.go` | ☐ |
| 6 | Add timeout/retry/fallback behavior for ML service downtime | `internal/grpcclient/ml_client.go` | ☐ |

### End-of-Day Verify

- Admin model table can load real metrics/status
- Retrain endpoint works (or returns accepted async job id)

---

## Day 8 - Data Sources, Activity Log, and Settings APIs

### Objectives

- Complete the remaining admin dashboard sections

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/data-sources` from metadata table/config | `internal/handler/admin_data.go`, `internal/service/admin_data_service.go` | ☐ |
| 2 | Add `GET /api/v1/admin/activity-log` with search/filter/date range | `internal/handler/admin_audit.go` | ☐ |
| 3 | Add `GET /api/v1/admin/settings` | `internal/handler/admin_settings.go` | ☐ |
| 4 | Add `PUT /api/v1/admin/settings` with validation limits | `internal/handler/admin_settings.go` | ☐ |
| 5 | Implement settings cache invalidation (Redis) on updates | `internal/service/admin_settings_service.go` | ☐ |
| 6 | Add endpoint tests for settings + activity log filters | `internal/handler/admin_settings_test.go`, `internal/handler/admin_audit_test.go` | ☐ |

### End-of-Day Verify

- Settings form can read/write values
- Full audit table data is queryable with filters

---

## Day 9 - Hardening, Performance, and Optional CSV Import

### Objectives

- Improve reliability and ship-readiness

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `POST /api/v1/admin/wells/import` multipart CSV endpoint (optional but useful) | `internal/handler/admin.go`, `internal/service/well_import_service.go` | ☐ |
| 2 | Add pagination defaults/limits to prevent heavy admin queries | `internal/handler/*.go` | ☐ |
| 3 | Add DB query optimization and index review | `migrations/*.sql`, `internal/repository/*.go` | ☐ |
| 4 | Add Prometheus metrics for admin endpoint latency/errors | `internal/middleware/metrics.go` | ☐ |
| 5 | Add integration smoke test script for all admin endpoints | `scripts/admin_smoke_test.sh` or `.ps1` | ☐ |
| 6 | Verify security checklist (JWT secret length, role checks, no hardcoded secrets) | `.env.example`, middleware/service files | ☐ |

### End-of-Day Verify

- Core admin APIs are stable under moderate load
- Optional CSV import path works end-to-end

---

## Day 10 - Final QA, Docker, and Release

### Objectives

- Freeze and ship backend for admin dashboard integration

### Tasks

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Finalize Dockerfiles and compose for backend + db + redis + ml-service deps | `Dockerfile`, `docker-compose.yml` | ☐ |
| 2 | Run end-to-end admin smoke tests against running stack | `scripts/admin_smoke_test.*` | ☐ |
| 3 | Produce endpoint docs with request/response examples | `README.md` | ☐ |
| 4 | Add sample admin seed user and setup instructions | `scripts/seed.go`, `README.md` | ☐ |
| 5 | Tag release candidate and create release notes | `CHANGELOG.md` (if used) | ☐ |
| 6 | Buffer for bug fixes from frontend integration | relevant files | ☐ |

### End-of-Day Verify (Ship Criteria)

- All admin dashboard APIs functional with auth
- No blocker bugs in core admin flows
- Docker startup is reproducible
- Documentation is sufficient for frontend wiring

---

## Admin API Checklist (Must Be Available by Day 10)

| Method | Endpoint | Priority |
|--------|----------|----------|
| POST | `/api/v1/auth/login` | P0 |
| GET | `/api/v1/admin/overview` | P0 |
| GET | `/api/v1/admin/analytics` | P0 |
| GET | `/api/v1/admin/health` | P0 |
| GET | `/api/v1/admin/users` | P0 |
| PUT | `/api/v1/admin/users/:id` | P1 |
| PUT | `/api/v1/admin/users/:id/suspend` | P0 |
| PUT | `/api/v1/admin/users/:id/activate` | P0 |
| GET | `/api/v1/admin/officers` | P0 |
| POST | `/api/v1/admin/users` | P0 |
| DELETE | `/api/v1/admin/officers/:id` | P1 |
| GET | `/api/v1/admin/models` | P0 |
| POST | `/api/v1/admin/models/retrain` | P1 |
| GET | `/api/v1/admin/data-sources` | P1 |
| GET | `/api/v1/admin/activity-log` | P0 |
| GET | `/api/v1/admin/settings` | P0 |
| PUT | `/api/v1/admin/settings` | P0 |
| POST | `/api/v1/admin/wells/import` | P2 |

Priority legend:

- `P0`: mandatory for dashboard go-live
- `P1`: important, should ship in v1
- `P2`: optional if time permits

---

## Minimal Daily Routine (Solo Dev)

Use this rhythm each day:

1. 45 min: review yesterday's blockers and define today's 2-3 must-win tasks
2. 4-5 hrs: implementation
3. 1 hr: tests + API verification via curl/Postman
4. 30 min: docs and commit hygiene
5. 15 min: update checklist and next-day plan

---

## Risk Controls for Solo Execution

| Risk | Mitigation |
|------|------------|
| Too much scope for one person | Lock scope to admin-only endpoints and P0/P1 priorities |
| Integration delays with ML service | Keep retrain trigger async/stub-capable; prioritize `GET /admin/models` first |
| Debugging time overruns | Add smoke scripts by Day 5 and run daily |
| Security regressions | Enforce middleware route groups; add auth tests before feature expansion |
| SQL performance issues | Add pagination and indexes early (Day 2/Day 5) |

---

## Definition of Done

Admin backend is done when:

- All P0 endpoints return correct data with `admin` JWT
- All write actions are audit-logged with actor and IP
- Settings can be updated safely with validation
- Health and model status endpoints are reliable
- Backend runs with Docker and can be consumed by `frontend/v2/dashboard-admin.html`
