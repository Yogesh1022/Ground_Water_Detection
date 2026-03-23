# Implementation Tickets Over2: What To Do and Why

Date: 2026-03-15
Goal: Convert architecture understanding into executable implementation tickets
Audience: You and any collaborator implementing backend end-to-end

## 1) How to use this file

1. Execute tickets in order.
2. Do not jump ahead unless dependencies are complete.
3. Each ticket has:
   - Why this matters
   - What to implement
   - Files to touch
   - API and data impact
   - Done criteria
   - Validation steps
4. Complete each ticket with working code and basic tests before moving on.

---

## 2) Fast orientation (read this first)

Read these files in order before starting implementation:

1. [over2.md](over2.md)
2. [backend_dependency_diagram_over2.md](backend_dependency_diagram_over2.md)
3. [complete_roadmap_over2.md](complete_roadmap_over2.md)
4. [backend/cmd/server/main.go](backend/cmd/server/main.go)
5. [backend/internal/handler/router.go](backend/internal/handler/router.go)
6. [backend/migrations/schema.sql](backend/migrations/schema.sql)

Why:
- This gives control-flow, route-flow, and data-model context before coding.

---

## 3) Phase 0 Tickets: Security and Baseline Hygiene

## Ticket P0-1: Sanitize environment template

Why:
- Prevent accidental credential leakage and align with team-safe defaults.

What:
1. Replace real-looking values in [backend/.env.example](backend/.env.example) with placeholders.
2. Keep variable names unchanged.

Files:
1. [backend/.env.example](backend/.env.example)

Done criteria:
1. No sensitive credentials remain in template.
2. App still starts with a real local .env file.

Validation:
1. Start backend using your real .env.
2. Confirm health endpoint returns 200.

## Ticket P0-2: Add request-id middleware

Why:
- Makes debugging and tracing across logs much easier.

What:
1. Add middleware to generate or pass through X-Request-ID.
2. Include request id in logger output and error responses.

Files:
1. backend/internal/middleware/request_id.go
2. [backend/internal/middleware/logger.go](backend/internal/middleware/logger.go)
3. [backend/cmd/server/main.go](backend/cmd/server/main.go)

Done criteria:
1. Every request has a request id.
2. Request id appears in logs.

Validation:
1. Call any endpoint with and without X-Request-ID.
2. Verify returned/propagated value in response headers and logs.

---

## 4) Phase 1 Tickets: Common HTTP Contract (shared foundation)

## Ticket P1-1: Unified response envelope

Why:
- Frontend integration becomes predictable and less error-prone.

What:
1. Create standard response structure for success and error.
2. Use it across all new endpoints.

Files:
1. backend/internal/common/http/response.go
2. backend/internal/common/http/errors.go

Done criteria:
1. New handlers return consistent JSON structure.
2. Error codes and messages are standardized.

Validation:
1. Hit success and failure paths and compare response shape.

## Ticket P1-2: Pagination helper utilities

Why:
- Repeated list endpoints need consistent paging logic.

What:
1. Add shared helpers for page/limit/offset and total-pages.
2. Use helpers in repository list functions.

Files:
1. backend/internal/common/pagination/pagination.go

Done criteria:
1. No duplicate page/offset formula logic in handlers.

Validation:
1. Verify page 1/page 2 behave consistently across at least two list APIs.

---

## 5) Phase 2 Tickets: Citizen vertical slice (first full real flow)

Goal:
- First production-like end-to-end path: login -> create complaint -> list complaints.

## Ticket P2-1: Citizen DTOs and route expansion

Why:
- Contract-first approach prevents handler/service mismatch.

What:
1. Define citizen DTOs for complaint create/list/detail and alerts.
2. Expand citizen routes beyond me.

Files:
1. backend/internal/dashboard/common_user/dto/dto.go
2. [backend/internal/dashboard/common_user/handler/routes.go](backend/internal/dashboard/common_user/handler/routes.go)

Done criteria:
1. Citizen routes for complaint create/list/detail exist.

Validation:
1. Route registration visible and callable.

## Ticket P2-2: Citizen complaint repository and service

Why:
- Persisted complaint lifecycle is a core product function.

What:
1. Implement repository methods:
   - Create complaint
   - List complaints by user
   - Get complaint by id and user
2. Implement service validations and business rules.

Files:
1. backend/internal/dashboard/common_user/repository/complaint_repo.go
2. backend/internal/dashboard/common_user/service/complaint_service.go

Done criteria:
1. Citizen can create and retrieve own complaints.
2. Unauthorized access to other user complaint is blocked.

Validation:
1. Integration test with two users and ownership checks.

## Ticket P2-3: Citizen complaint handlers

Why:
- Expose core business functionality through API.

What:
1. Add handlers for:
   - POST /api/v1/common-user/complaints
   - GET /api/v1/common-user/complaints
   - GET /api/v1/common-user/complaints/:id

Files:
1. backend/internal/dashboard/common_user/handler/complaints.go
2. [backend/internal/dashboard/common_user/handler/routes.go](backend/internal/dashboard/common_user/handler/routes.go)

Done criteria:
1. Endpoints return expected payloads with pagination where applicable.

Validation:
1. Curl/manual API tests for create/list/detail.
2. go test for handler + service.

## Ticket P2-4: Citizen alerts feed

Why:
- Alerts are key value for users and easy next API after complaints.

What:
1. Implement active alerts list, optional district filter.

Files:
1. backend/internal/dashboard/common_user/repository/alert_repo.go
2. backend/internal/dashboard/common_user/service/alert_service.go
3. backend/internal/dashboard/common_user/handler/alerts.go

Done criteria:
1. GET citizen alerts works with stable response shape.

Validation:
1. Test with seeded alerts in DB.

---

## 6) Phase 3 Tickets: Gov operations vertical slice

Goal:
- Turn complaints into actionable officer workflow.

## Ticket P3-1: Gov complaint queue and filters

Why:
- Officers need operational visibility first.

What:
1. Add list endpoint with status/severity/district-aware filters.

Files:
1. backend/internal/dashboard/govn_user/dto/dto.go
2. backend/internal/dashboard/govn_user/repository/complaint_repo.go
3. backend/internal/dashboard/govn_user/service/complaint_service.go
4. backend/internal/dashboard/govn_user/handler/complaints.go

Done criteria:
1. Officer sees district-scoped complaint queue.

Validation:
1. Filter combinations return expected subset.

## Ticket P3-2: Assign and status transitions

Why:
- This is the core complaint lifecycle engine.

What:
1. Implement endpoints:
   - PATCH assign
   - PATCH status
   - PATCH escalate
2. Write audit logs for each action.

Files:
1. backend/internal/dashboard/govn_user/repository/task_repo.go
2. backend/internal/dashboard/govn_user/repository/audit_repo.go
3. backend/internal/dashboard/govn_user/service/complaint_service.go
4. backend/internal/dashboard/govn_user/handler/complaint_actions.go

Done criteria:
1. Lifecycle transition rules are enforced.
2. Audit log rows are inserted.

Validation:
1. Transition matrix test (valid and invalid transitions).

## Ticket P3-3: Tanker route APIs

Why:
- Critical district operations view depends on tanker data.

What:
1. Implement list/create/update tanker route endpoints.

Files:
1. backend/internal/dashboard/govn_user/repository/tanker_repo.go
2. backend/internal/dashboard/govn_user/service/tanker_service.go
3. backend/internal/dashboard/govn_user/handler/tankers.go

Done criteria:
1. Tanker schedule section can be fully API-driven.

Validation:
1. CRUD-lite API tests.

---

## 7) Phase 4 Tickets: Admin governance vertical slice

Goal:
- Enable platform operations and system administration.

## Ticket P4-1: Admin user and officer management

Why:
- No other role operations scale without admin management.

What:
1. Implement list/create/update/activate APIs for users and officers.
2. Enforce role-safe constraints and uniqueness checks.

Files:
1. backend/internal/dashboard/admin/dto/dto.go
2. backend/internal/dashboard/admin/repository/user_repo.go
3. backend/internal/dashboard/admin/service/user_service.go
4. backend/internal/dashboard/admin/handler/users.go

Done criteria:
1. Admin can manage citizen and gov accounts.

Validation:
1. End-to-end create and update tests.

## Ticket P4-2: Admin overview and activity log

Why:
- Gives real operational confidence and observability.

What:
1. Implement overview KPI endpoint.
2. Implement audit/activity list endpoint.

Files:
1. backend/internal/dashboard/admin/repository/audit_repo.go
2. backend/internal/dashboard/admin/service/overview_service.go
3. backend/internal/dashboard/admin/handler/overview.go
4. backend/internal/dashboard/admin/handler/activity.go

Done criteria:
1. Admin dashboard summary and logs are API-backed.

Validation:
1. Compare KPI values against direct DB queries.

## Ticket P4-3: Settings and model registry endpoints

Why:
- Enables controlled system behavior and ML visibility.

What:
1. Implement read/update system settings.
2. Implement model registry list endpoint.

Files:
1. backend/internal/dashboard/admin/repository/settings_repo.go
2. backend/internal/dashboard/admin/repository/model_repo.go
3. backend/internal/dashboard/admin/service/settings_service.go
4. backend/internal/dashboard/admin/service/model_service.go
5. backend/internal/dashboard/admin/handler/settings.go
6. backend/internal/dashboard/admin/handler/models.go

Done criteria:
1. Settings and model tables are surfaced via API.

Validation:
1. Update settings and verify persistence.

---

## 8) Phase 5 Tickets: Prediction integration (ML bridge)

Goal:
- Convert planned ML architecture into live prediction APIs.

## Ticket P5-1: Add ML client abstraction

Why:
- Keeps backend decoupled from ML transport details.

What:
1. Define interface for Predict and ModelStatus.
2. Add mock implementation for local development.

Files:
1. backend/internal/ml/client/interface.go
2. backend/internal/ml/client/mock_client.go

Done criteria:
1. Citizen predict service compiles against interface only.

Validation:
1. Unit tests with mock outputs.

## Ticket P5-2: Real ML transport implementation

Why:
- Production prediction requires real inference backend.

What:
1. Implement HTTP or gRPC client to ML service.
2. Add timeout, retries, error mapping.

Files:
1. backend/internal/ml/client/http_client.go or grpc_client.go
2. backend/internal/config/config.go (ml settings extension)

Done criteria:
1. Prediction endpoint returns real model output.

Validation:
1. Integration test with running ML service.

## Ticket P5-3: Persist prediction outputs

Why:
- Needed for analytics, auditability, and history.

What:
1. Save prediction request and model outputs to predictions table.
2. Expose prediction history for citizen.

Files:
1. backend/internal/dashboard/common_user/repository/prediction_repo.go
2. backend/internal/dashboard/common_user/service/predict_service.go
3. backend/internal/dashboard/common_user/handler/predict.go

Done criteria:
1. Prediction call and retrieval flow is complete.

Validation:
1. DB row exists for each successful prediction.

---

## 9) Phase 6 Tickets: Performance and reliability

## Ticket P6-1: Caching hot endpoints

Why:
- Summary endpoints are read-heavy and expensive.

What:
1. Add cache wrapper for district/admin overview endpoints.
2. Introduce key conventions and ttl policy.

Files:
1. backend/internal/cache/keys.go
2. backend/internal/cache/cache_service.go
3. service files for summary endpoints

Done criteria:
1. Endpoint latency improves and db load drops.

Validation:
1. Compare cold vs warm request latency.

## Ticket P6-2: Rate limiting and security headers

Why:
- Protect auth and predict endpoints from abuse.

What:
1. Add configurable rate-limit middleware.
2. Add security response headers middleware.

Files:
1. backend/internal/middleware/rate_limit.go
2. backend/internal/middleware/security_headers.go
3. [backend/cmd/server/main.go](backend/cmd/server/main.go)

Done criteria:
1. Limits enforced on critical paths.

Validation:
1. Burst test shows throttling behavior.

---

## 10) Phase 7 Tickets: Test suite and docs finish

## Ticket P7-1: Unit and integration tests

Why:
- Prevent regressions as module count grows.

What:
1. Service tests for auth/citizen/gov/admin domains.
2. Handler tests for key endpoints.
3. DB-backed integration tests for complaint lifecycle.

Files:
1. backend/internal/**/**/*_test.go
2. backend/test/integration/*_test.go
3. backend/test/fixtures/*.sql

Done criteria:
1. Core routes covered by automated tests.

Validation:
1. go test ./... passes with meaningful coverage.

## Ticket P7-2: API contract documentation

Why:
- Frontend-backend sync and future onboarding become simpler.

What:
1. Add endpoint docs with request/response examples.
2. Include auth and error guide.

Files:
1. backend/docs/openapi.yaml
2. backend/docs/auth.md
3. backend/docs/errors.md
4. backend/docs/examples/*.http

Done criteria:
1. Every implemented endpoint documented.

Validation:
1. Frontend can integrate using docs only.

---

## 11) Acceptance checklist for backend completion

Backend can be considered complete when:

1. All three role dashboards are API-driven end-to-end.
2. Real JWT login is integrated from frontend.
3. Prediction path is real, persisted, and observable.
4. Complaint and task lifecycle is role-safe and audited.
5. Tests pass and docs are complete.
6. Security middleware and operational runbook are in place.

---

## 12) Suggested weekly cadence

Week 1:
1. P0 and P1
2. P2 (Citizen vertical slice complete)

Week 2:
1. P3 (Gov operations)
2. P4 (Admin controls)

Week 3:
1. P5 (ML bridge)
2. P6 (performance and security)

Week 4:
1. P7 (tests + docs)
2. Stabilization and bug-fix window

---

## 13) Why this sequence works

1. Starts with safety and shared contracts.
2. Delivers one real user flow early (citizen).
3. Expands to operational and governance roles.
4. Integrates ML after CRUD foundations are stable.
5. Ends with hardening, test confidence, and documentation.

This reduces risk and gives continuous visible progress.
