# AquaVidarbha - 10-Day Complete Backend Implementation Plan (All Dashboards)

> Team model: 2+ developers working in parallel using role-based folder ownership
>
> Goal in 10 days: Ship complete backend for common user, admin, and govn dashboards with shared auth/router/middleware and one DB schema.

---

## Final Folder Ownership

Shared core (all devs, review required):
- backend/internal/handler/auth.go
- backend/internal/handler/router.go
- backend/internal/middleware/*
- backend/internal/config/*
- backend/migrations/*

Role-owned feature folders:
- backend/internal/dashboard/common_user/*
- backend/internal/dashboard/admin/*
- backend/internal/dashboard/govn_user/*

Golden rule:
- Shared code lives outside dashboard folders.
- Role feature code stays inside its own dashboard folder.

---

## Delivery Scope

Common user backend:
- me, predict, district summary, wells list/detail, alerts, complaints create/track/mine

Admin backend:
- me, overview, analytics, health, users/officers CRUD actions, models/retrain, data-sources, activity-log, settings, optional well import

Govn backend:
- me, overview, requests management, district analytics, forecast, crisis-zones, tankers, tasks/workload, activity-log, reports

Shared stack:
- JWT auth, role middleware, CORS/logger/recovery, DB migrations, Redis cache, audit logging

---

## Day-by-Day Master Plan (10 Days)

## Day 1 - Foundation and Route Contract

| Owner | Task | Files | Done |
|---|---|---|---|
| Shared | Freeze route prefixes and role mapping (`common-user`, `admin`, `govn-user`) | `backend/internal/handler/router.go` | ☐ |
| Shared | Validate auth middleware and role checks | `backend/internal/middleware/auth.go` | ☐ |
| Shared | Lock DTO naming conventions and response envelope | `backend/internal/dashboard/*/dto`, `pkg/response/*` | ☐ |
| Shared | DB schema freeze v1 for all three roles | `backend/migrations/*` | ☐ |

## Day 2 - Repository Layer Parallelization

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | Implement wells, alerts, complaints, predictions repositories | `backend/internal/dashboard/common_user/repository/*` | ☐ |
| admin | Implement users, audit, settings, model/data-source repositories | `backend/internal/dashboard/admin/repository/*` | ☐ |
| govn_user | Implement requests, district, tanker, task, activity repositories | `backend/internal/dashboard/govn_user/repository/*` | ☐ |
| Shared | Review index coverage and migration safety | `backend/migrations/*` | ☐ |

## Day 3 - Service Layer Parallelization

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | Implement profile, complaint, wells, predict services | `backend/internal/dashboard/common_user/service/*` | ☐ |
| admin | Implement overview, analytics, health, users, model services | `backend/internal/dashboard/admin/service/*` | ☐ |
| govn_user | Implement overview, request, analytics, forecast, tanker/task services | `backend/internal/dashboard/govn_user/service/*` | ☐ |
| Shared | Add shared validation patterns and helper contracts | role services + shared pkg | ☐ |

## Day 4 - Core Handlers (Wave 1)

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | me, wells, complaints handlers | `backend/internal/dashboard/common_user/handler/*` | ☐ |
| admin | me, overview, analytics, health handlers | `backend/internal/dashboard/admin/handler/*` | ☐ |
| govn_user | me, overview, requests handlers | `backend/internal/dashboard/govn_user/handler/*` | ☐ |
| Shared | Route registration and middleware sanity test | `backend/internal/handler/router.go` | ☐ |

## Day 5 - Core Handlers (Wave 2)

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | predict, districts summary, alerts handlers | `backend/internal/dashboard/common_user/handler/*` | ☐ |
| admin | users/officers CRUD handlers | `backend/internal/dashboard/admin/handler/*` | ☐ |
| govn_user | district analytics, forecast, crisis handlers | `backend/internal/dashboard/govn_user/handler/*` | ☐ |
| Shared | Merge-point review and conflict cleanup | integration branch | ☐ |

## Day 6 - Advanced Features

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | complaint hardening + predict persistence | `backend/internal/dashboard/common_user/service/*` | ☐ |
| admin | models/retrain + data-sources handlers | `backend/internal/dashboard/admin/handler/*` | ☐ |
| govn_user | tankers, tasks, workload handlers | `backend/internal/dashboard/govn_user/handler/*` | ☐ |
| Shared | gRPC client stability + timeout policy check | shared gRPC client/service wrappers | ☐ |

## Day 7 - Audit, Reports, and Settings

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | tests and response consistency pass | `backend/internal/dashboard/common_user/**/*_test.go` | ☐ |
| admin | activity-log + settings handlers | `backend/internal/dashboard/admin/handler/*` | ☐ |
| govn_user | activity-log + report endpoints | `backend/internal/dashboard/govn_user/handler/*` | ☐ |
| Shared | audit logging validation for all write endpoints | middleware + handlers | ☐ |

## Day 8 - Performance and Caching

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | cache for predict/district/alerts | `backend/internal/dashboard/common_user/service/*` | ☐ |
| admin | pagination limits, query optimization, optional import | `backend/internal/dashboard/admin/*` | ☐ |
| govn_user | cache for analytics/forecast and list endpoints | `backend/internal/dashboard/govn_user/service/*` | ☐ |
| Shared | metrics hooks for all role endpoints | `backend/internal/middleware/metrics.go` | ☐ |

## Day 9 - Testing and Security Hardening

| Owner | Task | Files | Done |
|---|---|---|---|
| common_user | full handler/service tests + smoke | role test files + scripts | ☐ |
| admin | full handler/service tests + smoke | role test files + scripts | ☐ |
| govn_user | full handler/service tests + smoke | role test files + scripts | ☐ |
| Shared | security checklist: role gates, JWT config, no secret leakage | router + middleware + handlers | ☐ |

## Day 10 - Final Integration and Release

| Owner | Task | Files | Done |
|---|---|---|---|
| Shared | run full `go test ./...` and fix blockers | backend all packages | ☐ |
| Shared | run end-to-end smoke across all role endpoints | scripts/*_smoke_test.* | ☐ |
| Shared | update unified backend API docs | README.md | ☐ |
| Shared | final docker validation and release tag | docker + runtime | ☐ |

---

## Merge Process (Daily)

1. Each developer pushes only their role folder changes + required shared changes.
2. Shared changes require at least one peer review.
3. Merge to integration branch first, never directly to main role branches.
4. Run compile + smoke after every merge.
5. Resolve conflicts in shared router/middleware immediately.

---

## Definition of Done (Complete Backend)

Complete backend is done when:
- All common_user, admin, and govn_user APIs are functional under their route prefixes.
- All write endpoints are audit-logged.
- Shared auth and role gates are enforced everywhere.
- One migration source of truth is used.
- `go test ./...` passes.
- Frontend dashboards can consume required endpoints end-to-end.
