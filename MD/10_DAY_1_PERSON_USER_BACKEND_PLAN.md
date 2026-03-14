# AquaVidarbha - 10-Day, 1-Developer Plan (User Backend Only, New Folder Structure)

> Owner: 1 backend developer
>
> Goal in 10 days: Ship complete User backend using the new role-based backend structure.

---

## Target Folder Structure (User Scope)

- backend/internal/handler/auth.go (shared login/register entry)
- backend/internal/handler/router.go (shared route wiring)
- backend/internal/middleware/* (shared)
- backend/internal/dashboard/common_user/handler/*
- backend/internal/dashboard/common_user/service/*
- backend/internal/dashboard/common_user/repository/*
- backend/internal/dashboard/common_user/dto/*

Shared code remains outside dashboard folders. User feature code must stay inside `dashboard/common_user`.

---

## Scope (User Complete Backend)

In scope:
- User auth access control (`role=citizen`)
- User profile endpoint
- Groundwater prediction endpoint (lat/lon input)
- District summary endpoint
- Well listing and well detail endpoints
- Alerts feed endpoint
- Complaint creation endpoint
- Complaint tracking endpoint by tracking number
- My complaints endpoint
- Input validation and pagination
- Prediction persistence for analytics

Out of scope:
- Admin dashboard APIs
- Gov officer dashboard APIs
- Full report generation pipeline
- Admin settings and model retrain controls

---

## API Targets (User)

- `GET /api/v1/common-user/me`
- `POST /api/v1/common-user/predict`
- `GET /api/v1/common-user/districts/summary`
- `GET /api/v1/common-user/wells`
- `GET /api/v1/common-user/wells/:id`
- `GET /api/v1/common-user/alerts`
- `POST /api/v1/common-user/complaints`
- `GET /api/v1/common-user/complaints/track/:number`
- `GET /api/v1/common-user/complaints/mine`

---

## Day-by-Day Plan (10 Days)

## Day 1 - Shared Wiring + User Route Skeleton

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Validate shared auth + middleware chain | `backend/internal/handler/auth.go`, `backend/internal/middleware/*` | ☐ |
| 2 | Wire common user group in shared router | `backend/internal/handler/router.go` | ☐ |
| 3 | Add user route registration function | `backend/internal/dashboard/common_user/handler/routes.go` | ☐ |
| 4 | Add starter user DTOs (predict/complaint/list filters) | `backend/internal/dashboard/common_user/dto/*.go` | ☐ |

## Day 2 - User Repository Layer

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add well read repository methods (`List`, `GetByID`, `GetLatestReading`) | `backend/internal/dashboard/common_user/repository/well_repo.go` | ☐ |
| 2 | Add complaint repository methods (`Create`, `GetByTrackingNumber`, `GetByUser`) | `backend/internal/dashboard/common_user/repository/complaint_repo.go` | ☐ |
| 3 | Add alert repository methods (`GetAll`, `GetByDistrict`) | `backend/internal/dashboard/common_user/repository/alert_repo.go` | ☐ |
| 4 | Add prediction repository method (`Store`) | `backend/internal/dashboard/common_user/repository/prediction_repo.go` | ☐ |

## Day 3 - User Service Foundation

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement user profile service (`Me`) | `backend/internal/dashboard/common_user/service/profile_service.go` | ☐ |
| 2 | Implement complaint service (`Create`, `Track`, `Mine`) | `backend/internal/dashboard/common_user/service/complaint_service.go` | ☐ |
| 3 | Implement well service (`List`, `Detail`) | `backend/internal/dashboard/common_user/service/well_service.go` | ☐ |
| 4 | Implement validation helpers for lat/lon, paging, complaint payloads | `backend/internal/dashboard/common_user/service/validator.go` | ☐ |

## Day 4 - User Handlers (Profile, Wells, Complaints)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add `GET /api/v1/common-user/me` | `backend/internal/dashboard/common_user/handler/profile.go` | ☐ |
| 2 | Add `GET /api/v1/common-user/wells` + filters/pagination | `backend/internal/dashboard/common_user/handler/wells.go` | ☐ |
| 3 | Add `GET /api/v1/common-user/wells/:id` | `backend/internal/dashboard/common_user/handler/wells.go` | ☐ |
| 4 | Add complaints handlers (`create`, `track`, `mine`) | `backend/internal/dashboard/common_user/handler/complaints.go` | ☐ |

## Day 5 - Prediction Pipeline (User)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement prediction orchestration service wrapper for user route | `backend/internal/dashboard/common_user/service/predict_service.go` | ☐ |
| 2 | Add `POST /api/v1/common-user/predict` with input validation | `backend/internal/dashboard/common_user/handler/predict.go` | ☐ |
| 3 | Persist prediction snapshot for analytics/audit | `backend/internal/dashboard/common_user/repository/prediction_repo.go` | ☐ |
| 4 | Add tests for predict request/response shape | `backend/internal/dashboard/common_user/handler/predict_test.go` | ☐ |

## Day 6 - District Summary + Alerts

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Implement district summary aggregation service | `backend/internal/dashboard/common_user/service/district_service.go` | ☐ |
| 2 | Add `GET /api/v1/common-user/districts/summary` | `backend/internal/dashboard/common_user/handler/districts.go` | ☐ |
| 3 | Implement alert feed service for user district/all alerts | `backend/internal/dashboard/common_user/service/alert_service.go` | ☐ |
| 4 | Add `GET /api/v1/common-user/alerts` | `backend/internal/dashboard/common_user/handler/alerts.go` | ☐ |

## Day 7 - Complaint Flow Hardening

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Enforce tracking number generation and uniqueness | `backend/internal/dashboard/common_user/service/complaint_service.go` | ☐ |
| 2 | Add status transition constraints for user-visible states | `backend/internal/dashboard/common_user/service/complaint_service.go` | ☐ |
| 3 | Add error mapping and response envelope consistency | `backend/internal/dashboard/common_user/handler/*.go` | ☐ |
| 4 | Add handler/service tests for complaint flows | `backend/internal/dashboard/common_user/**/*_test.go` | ☐ |

## Day 8 - Performance + Caching

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Add caching for district summary and alerts | `backend/internal/dashboard/common_user/service/district_service.go`, `alert_service.go` | ☐ |
| 2 | Add caching for repeated prediction requests (safe TTL) | `backend/internal/dashboard/common_user/service/predict_service.go` | ☐ |
| 3 | Add pagination defaults/limits to list endpoints | `backend/internal/dashboard/common_user/handler/*.go` | ☐ |
| 4 | Add load sanity checks for user endpoints | `scripts/user_smoke_test.*` | ☐ |

## Day 9 - Security + Quality

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Verify role gate on all common user endpoints | `backend/internal/handler/router.go` | ☐ |
| 2 | Add request validation edge-case tests | `backend/internal/dashboard/common_user/**/*_test.go` | ☐ |
| 3 | Add endpoint metrics hooks for user APIs | `backend/internal/middleware/metrics.go` | ☐ |
| 4 | Run security review (no sensitive data leakage in responses) | handlers + DTOs | ☐ |

## Day 10 - Final QA + Release

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run full user smoke tests | `scripts/user_smoke_test.*` | ☐ |
| 2 | Run coverage + fix final bugs | `backend/internal/dashboard/common_user/**/*_test.go` | ☐ |
| 3 | Update user API docs with request/response examples | `README.md` | ☐ |
| 4 | Final Docker/runtime verification | backend compose + runtime | ☐ |

---

## Definition of Done

User backend is complete when:
- All user APIs above pass auth and role checks
- Predict, complaint create, track, and list endpoints are stable
- Router path ownership is clean under `dashboard/common_user`
- `go test ./...` passes
- User dashboard frontend can consume all required endpoints
