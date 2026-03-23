# Common User Dashboard Backend - Execution Flow and Responsibilities

## Current Completion Status

The common_user backend is functionally implemented for the public dashboard flow.

### Implemented Layers

1. Router wiring for common_user endpoints
2. DTO contract for request/query/response models
3. Handler layer for HTTP request processing
4. Service layer for orchestration and business logic
5. Repository layer for database access
6. Build verification via `go test ./...`

### Active Endpoints

1. `GET /api/v1/common-user/me`
2. `GET /api/v1/common-user/wells`
3. `GET /api/v1/common-user/wells/:id`
4. `GET /api/v1/common-user/districts/summary`
5. `GET /api/v1/common-user/alerts`
6. `POST /api/v1/common-user/predict`
7. `POST /api/v1/common-user/complaints`
8. `GET /api/v1/common-user/complaints/track/:tracking`

## Layered Architecture Overview

The execution path follows this sequence:

`HTTP Request -> Router -> Handler -> Service -> Repository -> PostgreSQL -> Service -> Handler -> HTTP Response`

## Step-by-Step Boot and Route Wiring Flow

### Step 1: Server Startup

1. The application starts from `backend/cmd/server/main.go`.
2. Config is loaded from environment through `backend/internal/config/config.go`.
3. PostgreSQL pool and Redis client are initialized.
4. Gin middleware stack is registered.
5. Global routes are wired using `backend/internal/handler/router.go`.

### Step 2: Common User Group Setup

1. `router.go` creates route group: `/api/v1/common-user`.
2. This group is currently public (no auth middleware attached).
3. `RegisterRoutes(commonUserGroup, dbPool)` in common_user handler is called.

### Step 3: Dependency Injection for Common User Module

1. `backend/internal/dashboard/common_user/handler/routes.go` calls `NewCommonUserHandler(db)`.
2. `NewCommonUserHandler` creates repositories:
   - WellRepo
   - AlertRepo
   - ComplaintRepo
   - PredictionRepo
3. It then creates services using those repositories.
4. It returns one handler struct with all service dependencies.

## Responsibilities by Layer

## 1) DTO Layer Responsibility

File: `backend/internal/dashboard/common_user/dto/dto.go`

Purpose:

1. Defines strict API contracts.
2. Defines pagination models and helpers.
3. Defines request payload validations using binding tags.
4. Defines response shapes used by handlers and services.

Contains:

1. Pagination models: `PaginationQuery`, `PagedMeta`
2. Profile models
3. Wells models (list + detail)
4. District summary model
5. Alerts models
6. Predict request/response models
7. Complaint request/response models

## 2) Handler Layer Responsibility

Files in: `backend/internal/dashboard/common_user/handler`

Purpose:

1. Bind and validate incoming HTTP input.
2. Call the corresponding service method.
3. Map domain errors to HTTP status codes.
4. Return JSON responses.

Key files:

1. `routes.go`: endpoint registration
2. `common.go`: shared constructor and helper error/param functions
3. `profile.go`: profile endpoint handler
4. `wells.go`: wells and district summary handlers
5. `alerts.go`: alert feed handler
6. `predict.go`: prediction handler
7. `complaints.go`: complaint create and tracking handlers

## 3) Service Layer Responsibility

Files in: `backend/internal/dashboard/common_user/service`

Purpose:

1. Own business orchestration logic.
2. Keep handlers thin and transport-focused.
3. Normalize pagination behavior.
4. Coordinate external ML call plus fallback logic.
5. Persist prediction snapshots.

Key files:

1. `meta.go`: common paged metadata builder
2. `profile_service.go`: public profile behavior
3. `well_service.go`: list/detail and district summary orchestration
4. `alert_service.go`: active alerts orchestration
5. `district_service.go`: district summary orchestration
6. `complaint_service.go`: complaint create/track orchestration
7. `predict_service.go`: prediction call, fallback, persistence

## 4) Repository Layer Responsibility

Files in: `backend/internal/dashboard/common_user/repository`

Purpose:

1. Execute SQL queries only.
2. Convert SQL rows into DTO structs.
3. Return `ErrNotFound` for missing records.
4. Keep persistence concerns isolated from services/handlers.

Key files:

1. `errors.go`: shared repository error definitions
2. `well_repo.go`: well listing, well detail, district stats
3. `alert_repo.go`: active alerts with optional filters
4. `complaint_repo.go`: complaint create and fetch by tracking number
5. `prediction_repo.go`: prediction snapshot persistence

## Endpoint-Level Execution Flow

## A) GET /api/v1/common-user/me

1. Route maps to `getProfile`.
2. Handler calls `profileSvc.PublicProfile()`.
3. Service returns a public profile object.
4. Handler returns `200 OK` with JSON.

## B) GET /api/v1/common-user/wells

1. Query is bound to `dto.WellListQuery`.
2. Service normalizes page and limit.
3. Repository builds SQL filter (`district` optional).
4. Repository runs count + paged list query.
5. Service builds `PagedMeta`.
6. Handler returns `dto.WellListResponse`.

## C) GET /api/v1/common-user/wells/:id

1. Handler parses `:id`.
2. Service calls repository detail query.
3. Repository joins latest reading using lateral subquery.
4. Risk level is derived from depth thresholds.
5. Returns detail response or 404 if not found.

## D) GET /api/v1/common-user/districts/summary

1. Handler calls district service summary method.
2. Service calls well repository district stats query.
3. Repository reads from `district_stats` materialized view.
4. Handler returns `200 OK` with `data` array.

## E) GET /api/v1/common-user/alerts

1. Query binds to `dto.AlertQuery` (`district`, `type`).
2. Service calls alert repository.
3. Repository applies optional filters and fetches active alerts.
4. Handler returns sorted alerts by newest first.

## F) POST /api/v1/common-user/complaints

1. JSON binds to `dto.CreateComplaintRequest`.
2. Service calls complaint repository create method.
3. Repository inserts complaint row.
4. DB trigger generates `tracking_number` when needed.
5. Handler returns `201 Created` with complaint payload.

## G) GET /api/v1/common-user/complaints/track/:tracking

1. Handler normalizes tracking number (trim + uppercase).
2. Service calls repository fetch by tracking number.
3. Repository returns complaint or `ErrNotFound`.
4. Handler maps errors to 404 or 500.

## H) POST /api/v1/common-user/predict

1. JSON binds to `dto.PredictRequest`.
2. Service tries ML API call to `${ML_SERVICE_URL}/predict`.
3. If ML call fails or URL is missing, service creates fallback prediction.
4. Service stores prediction snapshot in `predictions` table.
5. Handler returns `200 OK` prediction response.

## Prediction Subflow Detail

Inside `predict_service.go`:

1. `Predict()` calls `callMLService()`.
2. If call succeeds, response is normalized for defaults.
3. If call fails, `fallbackPrediction()` generates deterministic safe output.
4. Forecast, risk, recommendation, and advice are included.
5. `predictionRepo.Store()` saves request and response artifacts as JSONB fields.

## Error Handling Flow

1. Repositories return `ErrNotFound` for no-row cases.
2. Handler helper in `common.go` maps:
   - `ErrNotFound` -> `404 Not Found`
   - Other errors -> `500 Internal Server Error`
3. Binding/validation errors in handlers return `400 Bad Request`.

## No Login/Signup Constraint Handling

Your requirement was: no login/signup for common_user dashboard.

How implemented:

1. No signup/login DTOs were added in common_user module.
2. Common_user route group is currently public in `backend/internal/handler/router.go`.
3. Public profile endpoint returns non-auth public identity model.

## Remaining Optional Enhancements

These are not blockers for current functionality:

1. Add handler/service/repository test files for common_user module.
2. Add a real ML prediction API implementation in Python service.
3. Add stricter domain validation and richer error taxonomy.
4. Add caching for repeated read-heavy endpoints.
5. Add profile persistence if future authenticated mode is needed.

## Quick Trace Example (One Request)

Example request: `GET /api/v1/common-user/alerts?district=Nagpur&type=warning`

1. Router sends request to common_user alerts handler.
2. Handler binds query into `dto.AlertQuery`.
3. Handler calls `alertSvc.ListActive(ctx, query)`.
4. Service calls `alertRepo.GetActive(ctx, query)`.
5. Repository runs SQL with optional filters.
6. Rows are scanned into `[]dto.AlertResponse`.
7. Response travels back service -> handler.
8. Handler returns `200 OK` with `{ "data": [...] }`.

---

If needed, this document can be expanded with sequence diagrams and API request/response examples for each endpoint.
