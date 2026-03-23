# Complete Backend Roadmap (Over2)

Date: 2026-03-15
Goal: End-to-end implementation roadmap from Level 0 to production finish
Scope: every backend file family, their purpose, and build order

## 0) How to read this roadmap

Each level contains:

1. Objective
2. Files to create or finalize
3. Purpose of each file
4. Completion criteria
5. Current status in your repo

Status legend:
- DONE: implemented and functional.
- PARTIAL: exists but incomplete.
- TODO: not implemented.

---

## Level 0: Repository Foundation

Objective:
- Establish Go module, folder boundaries, and run tooling.

Files:
1. backend/go.mod
2. backend/go.sum
3. backend/Makefile
4. backend/Dockerfile
5. backend/docker-compose.yml
6. backend/.env.example

Purpose:
1. Module identity and dependency graph.
2. Deterministic dependency integrity.
3. Repeatable dev commands.
4. Image build and runtime packaging.
5. Infrastructure orchestration for backend, Postgres, Redis.
6. Runtime configuration contract.

Completion criteria:
1. Backend can build and run from fresh clone.
2. Docker stack starts and health checks pass.

Current status:
- DONE, with a security cleanup note for .env.example placeholders.

---

## Level 1: Server Bootstrap and Lifecycle

Objective:
- Create robust server startup and shutdown flow.

Files:
1. backend/cmd/server/main.go

Purpose:
1. Load config and initialize dependencies.
2. Build Gin server and register middleware/routes.
3. Handle graceful shutdown.

Completion criteria:
1. Server starts on configured port.
2. Graceful shutdown works.

Current status:
- DONE.

---

## Level 2: Configuration System

Objective:
- Typed config loading and runtime validation.

Files:
1. backend/internal/config/config.go

Purpose:
1. Environment parsing and defaults.
2. Validation of critical security/runtime values.
3. DSN construction for DB connector.

Completion criteria:
1. Invalid security config fails fast at startup.
2. All env dependencies centrally managed.

Current status:
- DONE.

---

## Level 3: Cross-cutting Middleware

Objective:
- Add observability, reliability, CORS, and authn/authz boundaries.

Files:
1. backend/internal/middleware/logger.go
2. backend/internal/middleware/recovery.go
3. backend/internal/middleware/cors.go
4. backend/internal/middleware/auth.go

Purpose:
1. Request telemetry.
2. Panic isolation.
3. Browser compatibility/security policy.
4. Token validation and role gating.

Completion criteria:
1. Every route passes through logger/recovery/CORS.
2. Protected routes enforce JWT + role.

Current status:
- DONE for available routes.

---

## Level 4: Authentication Feature

Objective:
- Implement login endpoint and token issuance.

Files:
1. backend/internal/handler/auth.go
2. backend/internal/service/auth.go
3. backend/internal/handler/router.go (auth route wiring)

Purpose:
1. Validate credentials request payload.
2. Query users and verify password.
3. Issue JWT claims.
4. Return standardized auth response.

Completion criteria:
1. Valid login returns token and user.
2. Invalid credentials and inactive users handled properly.

Current status:
- DONE.

---

## Level 5: Route Topology and Role Module Shells

Objective:
- Establish route groups and role isolation.

Files:
1. backend/internal/handler/router.go
2. backend/internal/dashboard/common_user/handler/routes.go
3. backend/internal/dashboard/govn_user/handler/routes.go
4. backend/internal/dashboard/admin/handler/routes.go

Purpose:
1. Route map and role-specific group registration.
2. Minimal /me endpoint for each role.

Completion criteria:
1. Role groups created and protected.
2. Base role endpoint responds.

Current status:
- PARTIAL (skeleton done, business APIs missing).

---

## Level 6: Database Schema and Data Contracts

Objective:
- Define complete data model for all dashboard and ML operations.

Files:
1. backend/migrations/schema.sql
2. backend/migrations/schema_local.sql

Purpose:
1. Core domain tables and enums.
2. Indices, triggers, and utility functions.
3. Local non-PostGIS variant.

Completion criteria:
1. Schema initializes cleanly.
2. Auth and domain tables available.

Current status:
- DONE.

---

## Level 7: Citizen Module (Common User) Full Build

Objective:
- Implement full citizen dashboard backend.

Folders and files to implement:
1. backend/internal/dashboard/common_user/dto/dto.go
2. backend/internal/dashboard/common_user/repository/profile_repo.go
3. backend/internal/dashboard/common_user/repository/well_repo.go
4. backend/internal/dashboard/common_user/repository/complaint_repo.go
5. backend/internal/dashboard/common_user/repository/alert_repo.go
6. backend/internal/dashboard/common_user/repository/prediction_repo.go
7. backend/internal/dashboard/common_user/service/profile_service.go
8. backend/internal/dashboard/common_user/service/well_service.go
9. backend/internal/dashboard/common_user/service/complaint_service.go
10. backend/internal/dashboard/common_user/service/alert_service.go
11. backend/internal/dashboard/common_user/service/predict_service.go
12. backend/internal/dashboard/common_user/handler/routes.go (replace stub with full routes)

Purpose:
1. Citizen profile, map/well views.
2. Complaint create/list/detail.
3. Alert feed.
4. Prediction request and history.

Completion criteria:
1. Citizen dashboard can run fully on live APIs.

Current status:
- TODO except /me stub.

---

## Level 8: Gov Officer Module Full Build

Objective:
- Implement district operations workflow.

Folders and files to implement:
1. backend/internal/dashboard/govn_user/dto/dto.go
2. backend/internal/dashboard/govn_user/repository/complaint_repo.go
3. backend/internal/dashboard/govn_user/repository/task_repo.go
4. backend/internal/dashboard/govn_user/repository/tanker_repo.go
5. backend/internal/dashboard/govn_user/repository/district_repo.go
6. backend/internal/dashboard/govn_user/repository/audit_repo.go
7. backend/internal/dashboard/govn_user/service/overview_service.go
8. backend/internal/dashboard/govn_user/service/complaint_service.go
9. backend/internal/dashboard/govn_user/service/task_service.go
10. backend/internal/dashboard/govn_user/service/tanker_service.go
11. backend/internal/dashboard/govn_user/service/analytics_service.go
12. backend/internal/dashboard/govn_user/handler/routes.go (replace stub with full routes)

Purpose:
1. Complaint triage and status lifecycle.
2. Assignment and escalation.
3. Tanker route operations.
4. District analytics and officer activity views.

Completion criteria:
1. Gov dashboard actions fully backed by API.

Current status:
- TODO except /me stub.

---

## Level 9: Admin Module Full Build

Objective:
- Implement system governance and platform controls.

Folders and files to implement:
1. backend/internal/dashboard/admin/dto/dto.go
2. backend/internal/dashboard/admin/repository/user_repo.go
3. backend/internal/dashboard/admin/repository/well_repo.go
4. backend/internal/dashboard/admin/repository/model_repo.go
5. backend/internal/dashboard/admin/repository/settings_repo.go
6. backend/internal/dashboard/admin/repository/audit_repo.go
7. backend/internal/dashboard/admin/service/overview_service.go
8. backend/internal/dashboard/admin/service/user_service.go
9. backend/internal/dashboard/admin/service/well_service.go
10. backend/internal/dashboard/admin/service/model_service.go
11. backend/internal/dashboard/admin/service/settings_service.go
12. backend/internal/dashboard/admin/handler/routes.go (replace stub with full routes)

Purpose:
1. User/officer lifecycle management.
2. System settings management.
3. ML model registry visibility.
4. Audit and operational overview.

Completion criteria:
1. Admin dashboard fully API driven.

Current status:
- TODO except /me stub.

---

## Level 10: Shared Domain Utilities

Objective:
- Reduce duplication and standardize API behavior.

Files to add:
1. backend/internal/common/http/response.go
2. backend/internal/common/http/errors.go
3. backend/internal/common/pagination/pagination.go
4. backend/internal/common/validation/validation.go
5. backend/internal/common/audit/audit.go

Purpose:
1. Unified response envelope.
2. Unified error mapping.
3. Reusable paging/filtering utilities.

Completion criteria:
1. Consistent response contract across all modules.

Current status:
- TODO.

---

## Level 11: Prediction and ML Integration Layer

Objective:
- Connect backend API to model inference service.

Files to add (Go side):
1. backend/internal/ml/client/interface.go
2. backend/internal/ml/client/http_client.go or grpc_client.go
3. backend/internal/ml/service/predict_adapter.go
4. backend/internal/ml/service/model_status_adapter.go

Files to add (service integration config):
5. backend/internal/config/ml_config.go (or extend existing config.go)

Purpose:
1. Decouple transport from business logic.
2. Support mock mode and real inference mode.
3. Persist prediction outputs and explainability payloads.

Completion criteria:
1. /predict endpoints produce real model-backed output.

Current status:
- TODO.

---

## Level 12: Caching and Performance Layer

Objective:
- Improve latency for dashboard summary endpoints.

Files to add:
1. backend/internal/cache/keys.go
2. backend/internal/cache/cache_service.go
3. Module-specific cached query wrappers in services

Purpose:
1. Cache expensive aggregate queries.
2. Reduce DB pressure.

Completion criteria:
1. Defined cache policy and invalidation behavior.

Current status:
- TODO (Redis only connected currently).

---

## Level 13: Security Hardening and Operational Controls

Objective:
- Move from dev posture to production posture.

Files to add or update:
1. backend/internal/middleware/rate_limit.go
2. backend/internal/middleware/request_id.go
3. backend/internal/middleware/security_headers.go
4. backend/.env.example cleanup (placeholder secrets)
5. backend/internal/config/config.go updates for secure flags

Purpose:
1. Protect sensitive endpoints.
2. Improve request traceability.
3. Enforce stricter security defaults.

Completion criteria:
1. Security middleware enabled and configurable.

Current status:
- PARTIAL.

---

## Level 14: Testing Pyramid

Objective:
- Add confidence for safe iteration.

Files to add:
1. backend/internal/service/*_test.go
2. backend/internal/handler/*_test.go
3. backend/internal/middleware/*_test.go
4. backend/test/integration/*_test.go
5. backend/test/fixtures/*.sql
6. backend/test/smoke/smoke.http or shell script

Purpose:
1. Unit tests for business logic.
2. Integration tests for route-to-db flow.
3. Smoke tests for critical paths.

Completion criteria:
1. CI-grade reliable verification of core flows.

Current status:
- TODO (no test files currently).

---

## Level 15: API Documentation and Contract Governance

Objective:
- Freeze contract between frontend and backend.

Files to add:
1. backend/docs/openapi.yaml
2. backend/docs/errors.md
3. backend/docs/auth.md
4. backend/docs/examples/*.http

Purpose:
1. Prevent UI/backend drift.
2. Improve onboarding and maintenance.

Completion criteria:
1. Every live endpoint documented with request/response examples.

Current status:
- TODO.

---

## Level 16: Delivery and Release Readiness

Objective:
- Make deployment and operation repeatable.

Files to add:
1. backend/deploy/production.env.example
2. backend/deploy/docker-compose.prod.yml
3. backend/ops/runbook.md
4. backend/ops/backup_restore.md
5. backend/ops/monitoring_dashboard.md

Purpose:
1. Production deployment discipline.
2. Ops supportability.

Completion criteria:
1. Team can deploy, rollback, and troubleshoot with runbooks.

Current status:
- TODO.

---

## Final End-State Definition (Level End)

The backend is complete when all are true:

1. Frontend login uses real JWT auth endpoint.
2. Citizen, gov, and admin dashboards are fully API-backed.
3. Prediction endpoints call live ML integration layer.
4. Complaints/tasks/tankers/audit flows are persistent and role-safe.
5. System has tests, docs, caching, and security hardening.
6. Deployment runbooks and production config are available.

---

## Suggested execution order (practical)

1. Level 7 (Citizen core) first vertical slice.
2. Level 8 (Gov operations) second vertical slice.
3. Level 9 (Admin controls) third vertical slice.
4. Level 11 (ML integration) then wire prediction.
5. Levels 12 to 16 for hardening and release.

This order gives fast user-visible progress while reducing integration risk.
