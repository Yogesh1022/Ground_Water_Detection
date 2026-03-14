# AquaVidarbha: Complete 10-Day Backend Roadmap (GoLand)

Date: 2026-03-13
Scope: Convert current backend starter into production-ready API layer for the existing frontend dashboards (User, Gov Officer, Admin) in 10 days.

## 1) Current State Analysis

### Frontend idea and implementation status
- Frontend visual design is strong and near-complete across landing, login, user dashboard, gov dashboard, and admin dashboard.
- Frontend pages are currently demo/static driven (charts/tables/alerts seeded in HTML/JS).
- Frontend auth currently uses sessionStorage demo credentials in login page, not backend JWT login.
- No live API integration calls are present in v2 pages yet.

### Backend implemented status
- Implemented and working:
  - Health check endpoint.
  - JWT login endpoint.
  - Role-based middleware.
  - Role-scoped starter endpoints: admin/gov/citizen /me.
- Not yet implemented:
  - Dashboard data APIs.
  - Complaints lifecycle APIs.
  - Task assignment APIs.
  - Tanker scheduling APIs.
  - Alerts APIs.
  - Admin user-management APIs.
  - ML registry/settings/audit APIs.
  - Integration with prediction model service.

### Gap summary
- UI coverage is far ahead of API coverage.
- DB schema is comprehensive, but service/repository logic is mostly missing.
- No automated tests for business flows yet.
- Login UX in frontend is not aligned with backend auth contract.

## 2) Target Architecture to Implement in 10 Days

## Backend module boundaries
- Auth and Session:
  - Login, token claims, role guards.
- Citizen module:
  - Profile, complaint create/list/detail, prediction requests, alerts feed.
- Gov module:
  - Complaint queue, assign/update/escalate/resolve, tanker routes, district analytics.
- Admin module:
  - User/officer CRUD, model registry, settings, audit logs, platform KPIs.
- Shared infra:
  - DTO validation, standardized error responses, pagination/filtering, tracing/logging.

## Data sources
- PostgreSQL: source of truth for transactional data.
- Redis: caching hot dashboard queries and optional rate limiting.
- ML service bridge: internal client for prediction inference (Python process/API or model gateway).

## API versioning
- Keep current versioning: /api/v1/*
- Keep route groups by role:
  - /api/v1/common-user/*
  - /api/v1/govn-user/*
  - /api/v1/admin/*

## 3) Frontend-to-Backend Endpoint Matrix (Must Build)

## Auth
- POST /api/v1/auth/login
- GET /api/v1/admin/me
- GET /api/v1/govn-user/me
- GET /api/v1/common-user/me

## Citizen dashboard APIs
- GET /api/v1/common-user/home-summary
- POST /api/v1/common-user/predictions
- GET /api/v1/common-user/predictions/history
- GET /api/v1/common-user/map/wells
- GET /api/v1/common-user/map/district-risk
- POST /api/v1/common-user/complaints
- GET /api/v1/common-user/complaints
- GET /api/v1/common-user/complaints/:id
- GET /api/v1/common-user/alerts

## Gov dashboard APIs
- GET /api/v1/govn-user/overview
- GET /api/v1/govn-user/complaints
- PATCH /api/v1/govn-user/complaints/:id/status
- PATCH /api/v1/govn-user/complaints/:id/assign
- PATCH /api/v1/govn-user/complaints/:id/escalate
- GET /api/v1/govn-user/districts/summary
- GET /api/v1/govn-user/forecast
- POST /api/v1/govn-user/tasks
- GET /api/v1/govn-user/tasks
- GET /api/v1/govn-user/tankers
- POST /api/v1/govn-user/tankers
- PATCH /api/v1/govn-user/tankers/:id
- GET /api/v1/govn-user/activity

## Admin dashboard APIs
- GET /api/v1/admin/overview
- GET /api/v1/admin/analytics/district-kpis
- GET /api/v1/admin/system/health
- GET /api/v1/admin/users
- POST /api/v1/admin/users
- PATCH /api/v1/admin/users/:id
- GET /api/v1/admin/officers
- POST /api/v1/admin/officers
- PATCH /api/v1/admin/officers/:id
- GET /api/v1/admin/ml/models
- POST /api/v1/admin/ml/retrain
- GET /api/v1/admin/data/sources
- GET /api/v1/admin/activity
- GET /api/v1/admin/settings
- PATCH /api/v1/admin/settings

## 4) 10-Day GoLand Implementation Plan

## Day 1: Foundation hardening + contracts
Deliverables:
- Freeze API contract document for all pages.
- Add unified response and error envelope.
- Add request ID middleware and structured error logging.
- Add DTO packages per module (admin/gov/common-user).
- Add OpenAPI skeleton (Swagger annotations or YAML).
GoLand focus:
- Configure Run/Debug configs for server, tests, and migrations.
- Use Structural Search to enforce response format patterns.
DoD:
- All handlers return standardized JSON format.
- API contract markdown checked into repo.

## Day 2: Citizen complaint and alert core
Deliverables:
- Implement complaint create/list/detail for citizen.
- Implement citizen alert feed.
- Add complaint repository/service with pagination + filters.
- Add audit log write hooks for complaint create.
GoLand focus:
- Use database console for query validation and indexing checks.
- Use HTTP Client files (.http) for endpoint regression packs.
DoD:
- Citizen can create complaint and fetch its status timeline.

## Day 3: Gov complaint operations
Deliverables:
- Implement gov complaint queue endpoint with district filtering.
- Implement assign, status update, escalate endpoints.
- Implement task assignment create/list endpoints.
- Write audit logs for each state transition.
GoLand focus:
- Step debugger through transaction flow.
- Use code coverage view to verify service-layer branch coverage.
DoD:
- End-to-end complaint workflow: open -> assigned -> in_progress -> resolved.

## Day 4: Tanker schedule + district analytics
Deliverables:
- Implement tanker routes CRUD-lite (create/list/update/status).
- Implement district summary endpoint using district_stats view.
- Add gov overview endpoint (KPIs + counts).
- Add Redis cache for district summary and overview.
GoLand focus:
- Profiling slow queries and adding indexes as needed.
DoD:
- Gov dashboard key widgets load from API under acceptable latency.

## Day 5: Citizen prediction + map APIs
Deliverables:
- Implement prediction request endpoint (sync or async bridge).
- Save predictions, nearest wells JSON, and forecast JSON.
- Implement map wells endpoint and district risk endpoint.
- Add prediction history endpoint for user.
GoLand focus:
- Build interface for model adapter to allow mock + real mode.
DoD:
- User can submit coordinates and receive persisted prediction output.

## Day 6: Admin user/officer management
Deliverables:
- Implement admin users list/create/update.
- Implement officers list/create/update.
- Add role-safe validation and conflict checks.
- Add active/inactive toggle flows.
GoLand focus:
- Use refactor tools to keep repository/service interfaces clean.
DoD:
- Admin dashboard user/officer actions backed by real APIs.

## Day 7: Admin ML + settings + activity
Deliverables:
- Implement model registry list endpoint.
- Implement retrain trigger endpoint (queue/event or stubbed orchestrator).
- Implement settings read/update using system_settings.
- Implement activity log list with filters and pagination.
GoLand focus:
- Add test templates and live templates for handler tests.
DoD:
- Admin Data & ML tabs functional with API-backed data.

## Day 8: Frontend integration pass
Deliverables:
- Replace demo login with backend login in login page.
- Wire each dashboard tab to matching APIs.
- Add loading, empty-state, and error-state handling.
- Remove hardcoded static chart/table payloads where API exists.
GoLand focus:
- If editing JS in GoLand, use JS inspections for null safety and dead code cleanup.
DoD:
- Role login routes users correctly and dashboards read live backend data.

## Day 9: Test, performance, reliability
Deliverables:
- Add table-driven unit tests for services.
- Add handler integration tests using httptest and seeded DB.
- Add smoke test script for top 20 endpoints.
- Add Redis fallback behavior tests.
- Add rate limiting for prediction endpoint.
GoLand focus:
- Run full test suite with coverage targets visible in IDE.
DoD:
- Critical path tests pass in CI-like run.

## Day 10: Production readiness + handover
Deliverables:
- Final env hardening and secrets checklist.
- Migration sanity checks and rollback plan.
- API docs finalization and sample requests.
- Deployment guide + ops runbook.
- UAT checklist for citizen/gov/admin journeys.
GoLand focus:
- Create final run configurations for local, staging, and debug profiles.
DoD:
- Team can deploy and operate backend with clear runbooks.

## 5) Minimum Testing Checklist (Must Pass)

- Auth:
  - Invalid login, valid login, expired token, role mismatch.
- Citizen:
  - Create complaint, list own complaints, prediction request, alerts fetch.
- Gov:
  - Assign complaint, update status, escalate, tanker route update.
- Admin:
  - Create officer, suspend user, update settings, read activity logs.
- Non-functional:
  - P95 latency target for dashboard APIs.
  - DB transaction integrity for complaint/task updates.
  - Cache consistency for overview endpoints.

## 6) Suggested Team Execution in GoLand

- Branching:
  - feature/day1-contracts ... feature/day10-release
- Daily artifacts:
  - End-of-day API test report (.http or curl script output).
  - Endpoint coverage delta and pending blockers.
- Code review policy:
  - No handler merged without service tests.
  - No DB query merged without index impact check.

## 7) Risk Register and Mitigation

- Risk: Frontend remains static due to API mismatch.
  - Mitigation: Freeze contract on Day 1 and enforce DTO compatibility.
- Risk: Prediction integration delays.
  - Mitigation: Implement adapter with mock mode by Day 5, switch to real model when ready.
- Risk: Time overrun from too many admin features.
  - Mitigation: Prioritize CRUD and KPI read endpoints first; defer advanced filters if needed.
- Risk: Local environment conflicts (ports/credentials).
  - Mitigation: Standardize docker-compose ports and provide .env.dev template.

## 8) Definition of Success at Day 10

- All three dashboards fetch live data from backend.
- Demo login replaced by JWT auth.
- Complaint and task lifecycle fully operational.
- Admin can manage users/officers/settings and inspect activity logs.
- Prediction endpoint persists outputs and supports citizen and gov views.
- Test suite and smoke checks are executable in GoLand and terminal.

---

Owner: Backend Team (Go + PostgreSQL + Redis)
Primary IDE: GoLand
Execution window: 10 days
