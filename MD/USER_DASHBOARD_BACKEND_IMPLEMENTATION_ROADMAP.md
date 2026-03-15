# User Dashboard Backend Implementation Roadmap (Ground_Water_Detection)

## 1) What I reviewed before writing this roadmap

This roadmap is based on the current state of:

- `backend/` (Gin server, middleware, auth service, role route groups, DB schema)
- `frontend/v2/dashboard-user.html` (all user-facing widgets and interactions)
- `frontend/v2/index.html`, `frontend/v2/login.html` (entry and role patterns)
- `MD/IMPL_USER_BACKEND.md` and existing day plans (to avoid duplicate planning)
- `migrations/schema.sql` and `migrations/schema_local.sql` (target data model)

## 2) Current status summary (important)

Backend status right now:

- Auth is implemented (`POST /api/v1/auth/login`) with JWT + role claims.
- Route groups are created for admin/govn/common-user.
- Dashboard route handlers are only stubs (`GET /me` in each role).
- Database schema is comprehensive and already includes user-dashboard tables:
  - `wells`, `well_readings`, `predictions`, `complaints`, `alerts`, `district_stats`.
- Redis and Postgres wiring already exists in server bootstrap.

Frontend user dashboard status right now:

- `dashboard-user.html` has rich UI and feature sections but no backend API integration yet.
- Water check logic is currently mock/simulated in browser JS.
- Complaint submit and complaint tracking are currently static/demo behavior.

Conclusion:

- You should implement user dashboard backend as API-first and then wire this HTML to real endpoints.

---

## 3) Target backend capability mapped to dashboard-user.html

### A. Home page blocks

Needs APIs for:

- quick stats cards
- latest alerts
- district water table

### B. Check Water Level page

Needs APIs for:

- GPS prediction request (`lat`, `lon`)
- current depth + risk + recommendation
- 3-month forecast
- explainability/feature importance payload
- optional save of prediction history

### C. Water Map page

Needs APIs for:

- map points (district/taluka/village well markers)
- popup details (depth, risk, prediction snippets)

### D. Report Problem page

Needs APIs for:

- create complaint
- generate/return tracking number

### E. Track Complaint page

Needs APIs for:

- search complaint by tracking number
- list current user complaints (if authenticated flow)

### F. Alerts page

Needs APIs for:

- active alerts feed
- trend data for chart

---

## 4) API design decision you should finalize first

Your current `dashboard-user.html` is public (no login), but your backend route group for common-user currently requires `citizen` JWT.

Choose one model before coding:

1. Public dashboard + authenticated complaints (recommended for your current UI)
2. Fully authenticated citizen dashboard

Recommended split:

- Public read APIs under: `/api/v1/public/user-dashboard/*`
- Authenticated citizen APIs under: `/api/v1/common-user/*`

This avoids forcing login for map/alerts/prediction while keeping complaint history private.

---

## 5) Exact endpoint contract set to implement

### Public endpoints (for current dashboard-user.html)

- `GET /api/v1/public/user-dashboard/overview`
  - cards + key district snapshot
- `GET /api/v1/public/user-dashboard/alerts`
  - query: `district`, `type`, `limit`
- `GET /api/v1/public/user-dashboard/districts`
  - district table rows with level/trend/risk
- `GET /api/v1/public/user-dashboard/map/wells`
  - query: `district`, `risk`, `limit`
- `POST /api/v1/public/user-dashboard/predict`
  - body: `latitude`, `longitude` (+ optional env params)
  - returns: current prediction + next 3 months + chart/explainability payload
- `GET /api/v1/public/user-dashboard/alerts/trend`
  - chart series payload for alerts page trend chart

### Citizen-auth endpoints

- `GET /api/v1/common-user/me`
- `POST /api/v1/common-user/complaints`
- `GET /api/v1/common-user/complaints/mine`
- `GET /api/v1/common-user/complaints/track/:trackingNumber`

Optional guest complaint route (if you want no login complaints):

- `POST /api/v1/public/user-dashboard/complaints`
  - with phone/email and captcha/rate-limit safeguards

---

## 6) Step-by-step implementation plan (execution order)

## Step 0 - Baseline branch and scope lock

1. Create a dedicated branch for user backend work.
2. Freeze endpoint contract for dashboard-user.html integration.
3. Decide auth model (public vs citizen-only vs hybrid).

Deliverable:

- one API contract markdown in `MD/` with request/response examples.

## Step 1 - Create DTOs for user dashboard payloads

Implement in:

- `backend/internal/dashboard/common_user/dto/dto.go`

Add DTO groups for:

- Overview
- District table row
- Alert item + trend series
- Map well marker + popup detail
- Predict request/response (depth, risk, forecast, shap)
- Complaint create/list/track responses
- Pagination metadata

Deliverable:

- typed request/response models aligned to frontend blocks.

## Step 2 - Repository layer (DB reads/writes)

Implement files:

- `backend/internal/dashboard/common_user/repository/well_repo.go`
- `backend/internal/dashboard/common_user/repository/district_repo.go`
- `backend/internal/dashboard/common_user/repository/alert_repo.go`
- `backend/internal/dashboard/common_user/repository/prediction_repo.go`
- `backend/internal/dashboard/common_user/repository/complaint_repo.go`

Core queries:

- latest well reading per well
- district aggregates from `district_stats`
- active alerts feed
- complaint insert + tracking lookup + user complaints
- prediction insert for audit/history

Deliverable:

- clean query layer with context-aware methods and typed results.

## Step 3 - Service layer (business rules)

Implement files:

- `backend/internal/dashboard/common_user/service/overview_service.go`
- `backend/internal/dashboard/common_user/service/map_service.go`
- `backend/internal/dashboard/common_user/service/alert_service.go`
- `backend/internal/dashboard/common_user/service/complaint_service.go`
- `backend/internal/dashboard/common_user/service/predict_service.go`

Business logic to include:

- risk classification normalization (`SAFE`, `MODERATE`, `WARNING`, `DANGER`)
- fallback behavior when district stats are missing
- complaint validation + normalization of type/severity labels from UI text
- idempotency/rate-limit guard for repeated complaint submit
- map data shaping (marker radius/color based on depth)

Deliverable:

- reusable services decoupled from HTTP handlers.

## Step 4 - Prediction integration with Python microservice

Create a prediction client in Go:

- `backend/internal/dashboard/common_user/service/model_client.go`

Add config keys:

- `MODEL_SERVICE_URL`
- `MODEL_SERVICE_TIMEOUT_MS`

Flow:

1. Receive lat/lon in Go handler.
2. Call Python model microservice HTTP endpoint.
3. Transform model response into frontend response contract.
4. Persist prediction row in `predictions` table.
5. Cache by rounded lat/lon in Redis (short TTL).

Fallback strategy (must-have):

- if model service fails, return best-effort response from nearest well data + explicit `prediction_path` flag.

Deliverable:

- production-safe model orchestration path.

## Step 5 - HTTP handlers and route wiring

Update:

- `backend/internal/dashboard/common_user/handler/routes.go`
- `backend/internal/handler/router.go`

Add route groups:

- public group for dashboard reads and prediction
- auth group for citizen profile + complaints/mine

Handler files to add:

- `backend/internal/dashboard/common_user/handler/overview.go`
- `backend/internal/dashboard/common_user/handler/map.go`
- `backend/internal/dashboard/common_user/handler/alerts.go`
- `backend/internal/dashboard/common_user/handler/predict.go`
- `backend/internal/dashboard/common_user/handler/complaints.go`
- `backend/internal/dashboard/common_user/handler/profile.go`

Deliverable:

- complete endpoint surface with proper status codes and validation.

## Step 6 - Input validation and error contract hardening

Standards to enforce:

- unified JSON error structure: `code`, `message`, `details`
- strict lat/lon validation
- sanitize text fields for complaints
- pagination limits with defaults
- tracking number format validation (`R-XXXXXX`)

Deliverable:

- predictable API behavior and frontend-friendly errors.

## Step 7 - Redis caching for expensive read endpoints

Cache targets:

- district overview
- alerts feed
- map wells payload
- prediction responses by rounded coordinates and month

TTL recommendations:

- overview/map/alerts: 5-15 minutes
- prediction: 15-60 minutes (based on weather sensitivity)

Deliverable:

- reduced DB and model-service load.

## Step 8 - Seed data and local testability

You already have schema. Add seed scripts for:

- sample citizen users
- wells + latest readings
- alerts
- complaints

Keep seed SQL in:

- `backend/migrations/seed_local.sql`

Deliverable:

- frontend can immediately show realistic data in local dev.

## Step 9 - Tests (do not skip)

Add tests for:

- service logic (risk mapping, complaint rules)
- repository query correctness (with test DB)
- handler status codes and payload shape
- auth role gate behavior for common-user routes

Suggested files:

- `backend/internal/dashboard/common_user/service/*_test.go`
- `backend/internal/dashboard/common_user/handler/*_test.go`

Deliverable:

- confidence before wiring frontend JS.

## Step 10 - Frontend integration with dashboard-user.html

Replace static JS behavior in `frontend/v2/dashboard-user.html` with API calls:

- on page load: call overview, districts, alerts
- map page: fetch wells once and render markers from API
- check water level: geolocation -> call predict endpoint
- complaint submit: call complaint API and show returned tracking number
- complaint track: call tracking endpoint and render result table

Deliverable:

- user dashboard becomes fully live with real backend data.

---

## 7) Suggested file creation checklist

Create these first:

- `backend/internal/dashboard/common_user/dto/dto.go`
- `backend/internal/dashboard/common_user/repository/well_repo.go`
- `backend/internal/dashboard/common_user/repository/district_repo.go`
- `backend/internal/dashboard/common_user/repository/alert_repo.go`
- `backend/internal/dashboard/common_user/repository/prediction_repo.go`
- `backend/internal/dashboard/common_user/repository/complaint_repo.go`
- `backend/internal/dashboard/common_user/service/overview_service.go`
- `backend/internal/dashboard/common_user/service/map_service.go`
- `backend/internal/dashboard/common_user/service/alert_service.go`
- `backend/internal/dashboard/common_user/service/predict_service.go`
- `backend/internal/dashboard/common_user/service/model_client.go`
- `backend/internal/dashboard/common_user/service/complaint_service.go`
- `backend/internal/dashboard/common_user/handler/overview.go`
- `backend/internal/dashboard/common_user/handler/map.go`
- `backend/internal/dashboard/common_user/handler/alerts.go`
- `backend/internal/dashboard/common_user/handler/predict.go`
- `backend/internal/dashboard/common_user/handler/complaints.go`
- `backend/internal/dashboard/common_user/handler/profile.go`

---

## 8) API-to-UI field mapping for dashboard-user.html

Use this mapping during integration:

- Home stat card "Water Level Now" <- `overview.current_depth_mbgl`
- Home "Active Alerts" <- `overview.active_alerts_count`
- District table rows <- `districts[].{district,avg_depth_mbgl,trend,risk_status}`
- Check Water Level result hero <- `predict.{depth_mbgl,risk_level,recommendation}`
- 3-month timeline <- `predict.multi_month_forecast[0..2]`
- SHAP chart <- `predict.shap_features[]`
- Map circles <- `map_wells[].{latitude,longitude,depth_mbgl,risk_level}`
- Complaint success popup <- `create_complaint.tracking_number`
- Track complaint table <- `complaint_track` or `complaints_mine[]`
- Alerts list page <- `alerts[]`

---

## 9) Risks and controls

Risk 1: model microservice latency/failure

- Control: timeout + retry + fallback path + Redis cache

Risk 2: mismatch between UI labels and backend enums

- Control: normalization layer in complaint service

Risk 3: public endpoint abuse

- Control: IP rate limiting, request size caps, basic abuse detection

Risk 4: stale district stats

- Control: refresh strategy for `district_stats` materialized view

---

## 10) Practical 7-day execution schedule (focused)

Day 1:

- DTOs + API contract freeze + route design

Day 2:

- repositories for wells/districts/alerts/complaints

Day 3:

- services for overview/map/alerts + basic handlers

Day 4:

- prediction service + Python model client + persistence

Day 5:

- complaint create/track/mine handlers + validation hardening

Day 6:

- Redis caching + tests + seed data

Day 7:

- frontend wiring in `dashboard-user.html` + end-to-end QA

---

## 11) Definition of done for user dashboard backend

Done means:

- all user-dashboard required endpoints are implemented and tested
- `dashboard-user.html` reads real backend data (no mock prediction logic)
- complaint submit and tracking are persisted in DB
- prediction endpoint integrated with Python service and fallback-safe
- local docker setup runs end-to-end (`Go + Postgres + Redis + frontend static page`)
