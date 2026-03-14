# AquaVidarbha - 10-Day, 1-Developer Plan (Admin Backend Only, New Folder Structure)
> Owner: 1 backend developer
>
> Goal in 10 days: Ship complete Admin backend using the new role-based backend structure.
---
## Target Folder Structure (Admin Scope)
- backend/internal/handler/auth.go (shared login/register entry)
- backend/internal/handler/router.go (shared route wiring)
- backend/internal/middleware/* (shared)
- backend/internal/dashboard/admin/handler/*
- backend/internal/dashboard/admin/service/*
- backend/internal/dashboard/admin/repository/*
- backend/internal/dashboard/admin/dto/*
Shared code remains outside dashboard folders. Admin feature code must stay inside `dashboard/admin`.
---
## Scope (Admin Complete Backend)
In scope:
- Admin auth access control (`role=admin`)
- Admin overview and analytics
- Admin health
- Citizen management (list/edit/suspend/activate)
- Officer management (list/create/delete)
- Model registry and retrain trigger
- Data source overview
- Full audit log
- Settings read/update
- Optional CSV well import
Out of scope:
- Gov officer dashboard APIs
- User dashboard APIs
- WebSocket real-time layer (unless reused shared code already exists)
---
## API Targets (Admin)
- `GET /api/v1/admin/me`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/health`
- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id`
- `PUT /api/v1/admin/users/:id/suspend`
- `PUT /api/v1/admin/users/:id/activate`
- `GET /api/v1/admin/officers`
- `POST /api/v1/admin/users`
- `DELETE /api/v1/admin/officers/:id`
- `GET /api/v1/admin/models`
- `POST /api/v1/admin/models/retrain`
- `GET /api/v1/admin/data-sources`
- `GET /api/v1/admin/activity-log`
- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings`
- `POST /api/v1/admin/wells/import` (optional)
---
## Day-by-Day Plan (10 Days)
## Day 1 - Shared Wiring + Admin Route Skeleton
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Validate shared auth + middleware chain | `backend/internal/handler/auth.go`, `backend/internal/middleware/*` | ☐ |
| 2 | Wire admin group in shared router | `backend/internal/handler/router.go` | ☐ |
| 3 | Add admin route registration function | `backend/internal/dashboard/admin/handler/routes.go` | ☐ |
| 4 | Add starter admin DTOs | `backend/internal/dashboard/admin/dto/*.go` | ☐ |
## Day 2 - Admin Repository Layer
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add user read/write repository methods | `backend/internal/dashboard/admin/repository/user_repo.go` | ☐ |
| 2 | Add audit log repository methods | `backend/internal/dashboard/admin/repository/audit_repo.go` | ☐ |
| 3 | Add settings repository methods | `backend/internal/dashboard/admin/repository/settings_repo.go` | ☐ |
| 4 | Add model/data-source repository methods | `backend/internal/dashboard/admin/repository/model_repo.go`, `data_source_repo.go` | ☐ |
## Day 3 - Admin Service Foundation
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement admin overview service | `backend/internal/dashboard/admin/service/overview_service.go` | ☐ |
| 2 | Implement admin analytics service | `backend/internal/dashboard/admin/service/analytics_service.go` | ☐ |
| 3 | Implement admin health service | `backend/internal/dashboard/admin/service/health_service.go` | ☐ |
| 4 | Implement shared validation helpers used by admin | `backend/internal/dashboard/admin/service/validator.go` | ☐ |
## Day 4 - Overview, Analytics, Health Handlers
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/overview` | `backend/internal/dashboard/admin/handler/overview.go` | ☐ |
| 2 | Add `GET /api/v1/admin/analytics` | `backend/internal/dashboard/admin/handler/analytics.go` | ☐ |
| 3 | Add `GET /api/v1/admin/health` | `backend/internal/dashboard/admin/handler/health.go` | ☐ |
| 4 | Add handler tests for all three endpoints | `backend/internal/dashboard/admin/handler/*_test.go` | ☐ |
## Day 5 - Citizen Management
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/users` | `backend/internal/dashboard/admin/handler/users.go` | ☐ |
| 2 | Add `PUT /api/v1/admin/users/:id` | `backend/internal/dashboard/admin/handler/users.go` | ☐ |
| 3 | Add suspend/activate actions | `backend/internal/dashboard/admin/handler/users.go` | ☐ |
| 4 | Add business rules (cannot suspend self, etc.) | `backend/internal/dashboard/admin/service/user_service.go` | ☐ |
## Day 6 - Officer Management + Add User/Officer
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/officers` | `backend/internal/dashboard/admin/handler/officers.go` | ☐ |
| 2 | Add `POST /api/v1/admin/users` (citizen/officer) | `backend/internal/dashboard/admin/handler/users_create.go` | ☐ |
| 3 | Add `DELETE /api/v1/admin/officers/:id` | `backend/internal/dashboard/admin/handler/officers.go` | ☐ |
| 4 | Add tests for create/delete officer flow | `backend/internal/dashboard/admin/handler/*_test.go` | ☐ |
## Day 7 - Models + Retrain
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add model status service adapter | `backend/internal/dashboard/admin/service/model_service.go` | ☐ |
| 2 | Add `GET /api/v1/admin/models` | `backend/internal/dashboard/admin/handler/models.go` | ☐ |
| 3 | Add `POST /api/v1/admin/models/retrain` | `backend/internal/dashboard/admin/handler/models.go` | ☐ |
| 4 | Add timeout/fallback behavior | `backend/internal/dashboard/admin/service/model_service.go` | ☐ |
## Day 8 - Data Sources, Audit Log, Settings
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/admin/data-sources` | `backend/internal/dashboard/admin/handler/data_sources.go` | ☐ |
| 2 | Add `GET /api/v1/admin/activity-log` | `backend/internal/dashboard/admin/handler/activity_log.go` | ☐ |
| 3 | Add `GET /api/v1/admin/settings` | `backend/internal/dashboard/admin/handler/settings.go` | ☐ |
| 4 | Add `PUT /api/v1/admin/settings` | `backend/internal/dashboard/admin/handler/settings.go` | ☐ |
## Day 9 - Hardening + Optional Import
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add pagination limits and request validation | `backend/internal/dashboard/admin/handler/*.go` | ☐ |
| 2 | Add admin endpoint metrics hooks | `backend/internal/middleware/metrics.go` | ☐ |
| 3 | Add optional `POST /api/v1/admin/wells/import` | `backend/internal/dashboard/admin/handler/well_import.go` | ☐ |
| 4 | Run security checks for all admin endpoints | shared router + middleware | ☐ |
## Day 10 - Final QA + Release
| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run full admin smoke tests | `scripts/admin_smoke_test.*` | ☐ |
| 2 | Run coverage + fix final bugs | `backend/internal/dashboard/admin/**/*_test.go` | ☐ |
| 3 | Update admin API docs | `README.md` | ☐ |
| 4 | Final Docker verification | backend compose + runtime | ☐ |
---
## Definition of Done
Admin backend is complete when:
- All admin APIs above pass auth and role checks
- All write endpoints create audit records
- Router path ownership is clean under `dashboard/admin`
- `go test ./...` passes
- Admin dashboard frontend can consume all required endpoints
