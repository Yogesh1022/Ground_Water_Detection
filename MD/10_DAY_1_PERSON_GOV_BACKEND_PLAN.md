# AquaVidarbha - 10-Day, 1-Developer Plan (Govn User Backend Only, New Folder Structure)

> Owner: 1 backend developer
>
> Goal in 10 days: Ship complete Govn User backend using the new role-based backend structure.

---

## Target Folder Structure (Govn User Scope)

- backend/internal/handler/auth.go (shared login/register entry)
- backend/internal/handler/router.go (shared route wiring)
- backend/internal/middleware/* (shared)
- backend/internal/dashboard/govn_user/handler/*
- backend/internal/dashboard/govn_user/service/*
- backend/internal/dashboard/govn_user/repository/*
- backend/internal/dashboard/govn_user/dto/*

Shared code remains outside dashboard folders. Govn feature code must stay inside `dashboard/govn_user`.

---

## Scope (Govn User Complete Backend)

In scope:
- Govn auth access control (`role=gov`)
- Govn profile endpoint
- Command center KPIs
- Complaint/request management (list, assign, resolve, escalate)
- District analytics endpoint
- Forecast endpoint and crisis zones endpoint
- Tanker schedule endpoints
- Task assignment and team workload endpoints
- Govn activity log endpoint
- Govn report generation endpoints (PDF/CSV)

Out of scope:
- Admin dashboard APIs
- Common user dashboard APIs
- Admin settings and model retrain controls

---

## API Targets (Govn User)

- `GET /api/v1/govn-user/me`
- `GET /api/v1/govn-user/overview`
- `GET /api/v1/govn-user/requests`
- `PUT /api/v1/govn-user/requests/:id/assign`
- `PUT /api/v1/govn-user/requests/:id/resolve`
- `PUT /api/v1/govn-user/requests/:id/escalate`
- `GET /api/v1/govn-user/districts/analytics`
- `GET /api/v1/govn-user/forecast`
- `GET /api/v1/govn-user/crisis-zones`
- `GET /api/v1/govn-user/tankers`
- `POST /api/v1/govn-user/tankers`
- `POST /api/v1/govn-user/tasks`
- `GET /api/v1/govn-user/teams/workload`
- `GET /api/v1/govn-user/activity-log`
- `GET /api/v1/govn-user/reports/monthly-status`
- `GET /api/v1/govn-user/reports/ai-prediction`
- `GET /api/v1/govn-user/reports/citizen-requests`

---

## Day-by-Day Plan (10 Days)

## Day 1 - Shared Wiring + Govn Route Skeleton

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Validate shared auth + middleware chain | `backend/internal/handler/auth.go`, `backend/internal/middleware/*` | ☐ |
| 2 | Wire govn user group in shared router | `backend/internal/handler/router.go` | ☐ |
| 3 | Add govn route registration function | `backend/internal/dashboard/govn_user/handler/routes.go` | ☐ |
| 4 | Add starter govn DTOs | `backend/internal/dashboard/govn_user/dto/*.go` | ☐ |

## Day 2 - Govn Repository Layer

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add request repository methods (`List`, `Assign`, `Resolve`, `Escalate`) | `backend/internal/dashboard/govn_user/repository/request_repo.go` | ☐ |
| 2 | Add district analytics repository methods | `backend/internal/dashboard/govn_user/repository/district_repo.go` | ☐ |
| 3 | Add tanker repository methods (`List`, `Create`, `Update`) | `backend/internal/dashboard/govn_user/repository/tanker_repo.go` | ☐ |
| 4 | Add task and activity repositories | `backend/internal/dashboard/govn_user/repository/task_repo.go`, `activity_repo.go` | ☐ |

## Day 3 - Govn Service Foundation

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement overview KPI service | `backend/internal/dashboard/govn_user/service/overview_service.go` | ☐ |
| 2 | Implement request management service | `backend/internal/dashboard/govn_user/service/request_service.go` | ☐ |
| 3 | Implement district and forecast service wrappers | `backend/internal/dashboard/govn_user/service/analytics_service.go`, `forecast_service.go` | ☐ |
| 4 | Implement validation helpers for filters, pagination, and state transitions | `backend/internal/dashboard/govn_user/service/validator.go` | ☐ |

## Day 4 - Overview + Request Management Handlers

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/govn-user/overview` | `backend/internal/dashboard/govn_user/handler/overview.go` | ☐ |
| 2 | Add `GET /api/v1/govn-user/requests` | `backend/internal/dashboard/govn_user/handler/requests.go` | ☐ |
| 3 | Add assign/resolve/escalate handlers | `backend/internal/dashboard/govn_user/handler/requests_actions.go` | ☐ |
| 4 | Add handler tests for request flow | `backend/internal/dashboard/govn_user/handler/*_test.go` | ☐ |

## Day 5 - District Analytics + Forecast

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/govn-user/districts/analytics` | `backend/internal/dashboard/govn_user/handler/analytics.go` | ☐ |
| 2 | Add `GET /api/v1/govn-user/forecast` | `backend/internal/dashboard/govn_user/handler/forecast.go` | ☐ |
| 3 | Add `GET /api/v1/govn-user/crisis-zones` | `backend/internal/dashboard/govn_user/handler/crisis.go` | ☐ |
| 4 | Add service tests for aggregation and fallback behavior | `backend/internal/dashboard/govn_user/service/*_test.go` | ☐ |

## Day 6 - Tanker + Task Assignment

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add tanker endpoints (`GET`, `POST`) | `backend/internal/dashboard/govn_user/handler/tankers.go` | ☐ |
| 2 | Add task assignment endpoint (`POST /tasks`) | `backend/internal/dashboard/govn_user/handler/tasks.go` | ☐ |
| 3 | Add workload endpoint (`GET /teams/workload`) | `backend/internal/dashboard/govn_user/handler/workload.go` | ☐ |
| 4 | Add tests for tanker/task/workload flows | `backend/internal/dashboard/govn_user/handler/*_test.go` | ☐ |

## Day 7 - Activity Log + Reports

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/govn-user/activity-log` | `backend/internal/dashboard/govn_user/handler/activity_log.go` | ☐ |
| 2 | Add monthly status report endpoint | `backend/internal/dashboard/govn_user/handler/reports.go` | ☐ |
| 3 | Add AI prediction report endpoint | `backend/internal/dashboard/govn_user/handler/reports.go` | ☐ |
| 4 | Add citizen requests CSV endpoint | `backend/internal/dashboard/govn_user/handler/reports.go` | ☐ |

## Day 8 - Performance + Caching

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add caching for analytics and forecast | `backend/internal/dashboard/govn_user/service/analytics_service.go`, `forecast_service.go` | ☐ |
| 2 | Add pagination defaults/limits to request and activity endpoints | `backend/internal/dashboard/govn_user/handler/*.go` | ☐ |
| 3 | Add error envelope consistency | `backend/internal/dashboard/govn_user/handler/*.go` | ☐ |
| 4 | Add smoke tests for core govn endpoints | `scripts/govn_smoke_test.*` | ☐ |

## Day 9 - Security + Quality

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Verify role gate on all govn endpoints | `backend/internal/handler/router.go` | ☐ |
| 2 | Verify audit logs on write endpoints | middleware + handlers | ☐ |
| 3 | Add endpoint metrics hooks for govn APIs | `backend/internal/middleware/metrics.go` | ☐ |
| 4 | Run edge-case tests for transitions and filtering | `backend/internal/dashboard/govn_user/**/*_test.go` | ☐ |

## Day 10 - Final QA + Release

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run full govn smoke tests | `scripts/govn_smoke_test.*` | ☐ |
| 2 | Run coverage + fix final bugs | `backend/internal/dashboard/govn_user/**/*_test.go` | ☐ |
| 3 | Update govn API docs with request/response examples | `README.md` | ☐ |
| 4 | Final Docker/runtime verification | backend compose + runtime | ☐ |

---

## Definition of Done

Govn backend is complete when:
- All govn APIs above pass auth and role checks
- Request management, forecast, tanker, task, and reports endpoints are stable
- Router path ownership is clean under `dashboard/govn_user`
- `go test ./...` passes
- Govn dashboard frontend can consume all required endpoints
