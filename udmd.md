# User Dashboard Complete Build Guide (Step 0 to Final)

## Objective
Build the full user dashboard end-to-end to match `frontend/v2/dashboard-user.html` exactly, including backend APIs, service logic, persistence, caching, tests, and frontend API wiring.

Role and route baseline:
- Public read flows: dashboard pages that do not require login
- Citizen protected flows: complaint history and profile
- Route prefixes:
  - Public: `/api/v1/public/user-dashboard`
  - Citizen: `/api/v1/common-user`

---

## Build Philosophy
1. Implement contracts first.
2. Build repository layer before handlers.
3. Keep service layer as business logic center.
4. Keep handlers thin (bind, call service, return response).
5. Replace mock frontend logic only after APIs are stable.
6. Add tests for every critical flow before release.

---

## Dashboard Structure Mapping (Same as dashboard-user.html)

### Global shell
- Sidebar, topbar, page switching, live badges, section navigation.
- Technical impact:
  - Requires API preload for Home stats, latest alerts, district rows.
  - Requires page-specific lazy fetch for Map and Detect.

### Page 1: Home
- Quick stat cards
- Current water status meter
- Latest alerts
- District table

### Page 2: Check Water Level
- Geolocation input
- Prediction hero output
- 3-month prediction timeline
- History chart
- Explainability chart

### Page 3: Water Map
- Leaflet well markers
- Popup with risk and forecast snippets

### Page 4: Report Problem
- Complaint create form
- Tracking number generation

### Page 5: Track Complaint
- Search by tracking number
- My complaints table

### Page 6: Alerts
- Alerts feed cards
- Trend chart

---

## Step 0 - Scope Lock and Contract Freeze

### Tasks
1. Freeze endpoint list for all six pages.
2. Freeze auth model per endpoint (public vs citizen).
3. Freeze response envelope and error envelope.
4. Freeze frontend field mappings by element ID used in dashboard-user.html.

### Output
- API contract document finalized.
- No further field renaming after this step.

---

## Step 1 - Data Model and DTO Foundation

### Files
- `backend/internal/dashboard/common_user/dto/dto.go`

### Create DTO groups
1. Common
- `APIError`
- `PaginationQuery`
- `PagedMeta`

2. Home
- `OverviewResponse`
- `HomeAlertItem`
- `DistrictRow`

3. Detect
- `PredictRequest`
- `PredictResponse`
- `MonthForecast`
- `ShapFeature`
- `PredictionChartSeries`

4. Map
- `MapWellsQuery`
- `MapWellPoint`

5. Complaint
- `CreateComplaintRequest`
- `CreateComplaintResponse`
- `ComplaintDetail`
- `ComplaintListResponse`

6. Alerts
- `AlertQuery`
- `AlertItem`
- `AlertTrendPoint`
- `AlertTrendResponse`

### Validation rules
- Latitude: -90 to 90
- Longitude: -180 to 180
- Pagination default: page 1, limit 20
- Limit max: 100
- Complaint type and severity enum validation

---

## Step 2 - Repository Layer (DB Access)

### Files
- `backend/internal/dashboard/common_user/repository/well_repo.go`
- `backend/internal/dashboard/common_user/repository/district_repo.go`
- `backend/internal/dashboard/common_user/repository/alert_repo.go`
- `backend/internal/dashboard/common_user/repository/prediction_repo.go`
- `backend/internal/dashboard/common_user/repository/complaint_repo.go`

### Required repository methods
1. Well repo
- `ListMapPoints(ctx, district, risk, limit)`
- `GetNearestWells(ctx, lat, lon, limit)`
- `GetLatestDepthByDistrict(ctx, district)`

2. District repo
- `GetDistrictRows(ctx, page, limit)`
- `GetOverviewAggregate(ctx)`

3. Alert repo
- `ListAlerts(ctx, district, type, limit)`
- `GetActiveAlertsCount(ctx)`
- `GetTrend(ctx, district, months)`

4. Prediction repo
- `StorePrediction(ctx, row)`
- `ListRecentPredictionsByHash(ctx, hashKey, withinMinutes)`

5. Complaint repo
- `Create(ctx, complaint)`
- `GetByTrackingNumber(ctx, number)`
- `ListByUser(ctx, userID, page, limit)`
- `ExistsTrackingNumber(ctx, number)`

### SQL expectations
- Use existing schema tables: `wells`, `well_readings`, `district_stats`, `alerts`, `predictions`, `complaints`.
- Use indexes for district, created_at, tracking number.

---

## Step 3 - Service Layer (Business Rules)

### Files
- `backend/internal/dashboard/common_user/service/overview_service.go`
- `backend/internal/dashboard/common_user/service/map_service.go`
- `backend/internal/dashboard/common_user/service/alert_service.go`
- `backend/internal/dashboard/common_user/service/predict_service.go`
- `backend/internal/dashboard/common_user/service/model_client.go`
- `backend/internal/dashboard/common_user/service/complaint_service.go`
- `backend/internal/dashboard/common_user/service/profile_service.go`
- `backend/internal/dashboard/common_user/service/validator.go`

### Service responsibilities
1. Overview service
- Compose Home cards and district table payload.

2. Map service
- Shape map marker radius/risk metadata.

3. Alert service
- List alerts and trend series.

4. Predict service
- Validate coordinates.
- Call Python model client.
- Normalize risk levels to dashboard color states.
- Build timeline and chart payload.
- Persist prediction snapshot.
- Fallback to nearest-well heuristic when model fails.

5. Complaint service
- Normalize complaint labels from UI text.
- Generate unique tracking number.
- Enforce allowed status transitions.

6. Profile service
- Return current user profile for `/me`.

---

## Step 4 - Prediction Client Integration

### Files and config
- File: `backend/internal/dashboard/common_user/service/model_client.go`
- Config keys:
  - `MODEL_SERVICE_URL`
  - `MODEL_SERVICE_TIMEOUT_MS`

### Flow
1. Receive `lat/lon` from detect page.
2. Call model service HTTP endpoint.
3. Parse model output.
4. Build `PredictResponse`.
5. Save to predictions table.
6. Cache by rounded coordinates.
7. Return response.

### Fallback behavior
If model call fails:
1. Query nearest wells.
2. Build conservative estimate.
3. Mark response with fallback indicator field `prediction_path`.

---

## Step 5 - Handler Layer and Route Wiring

### Handler files
- `backend/internal/dashboard/common_user/handler/routes.go`
- `backend/internal/dashboard/common_user/handler/overview.go`
- `backend/internal/dashboard/common_user/handler/districts.go`
- `backend/internal/dashboard/common_user/handler/alerts.go`
- `backend/internal/dashboard/common_user/handler/predict.go`
- `backend/internal/dashboard/common_user/handler/map.go`
- `backend/internal/dashboard/common_user/handler/complaints.go`
- `backend/internal/dashboard/common_user/handler/profile.go`

### Router wiring file
- `backend/internal/handler/router.go`

### Final endpoint list (sequence by dashboard pages)

#### Home page APIs
1. `GET /api/v1/public/user-dashboard/overview`
2. `GET /api/v1/public/user-dashboard/districts`
3. `GET /api/v1/public/user-dashboard/alerts?limit=3`

#### Detect page API
4. `POST /api/v1/public/user-dashboard/predict`

#### Map page API
5. `GET /api/v1/public/user-dashboard/map/wells?district=&risk=&limit=`

#### Complaint page APIs
6. `POST /api/v1/common-user/complaints`

#### Track page APIs
7. `GET /api/v1/common-user/complaints/track/:number`
8. `GET /api/v1/common-user/complaints/mine?page=&limit=`

#### Alerts page APIs
9. `GET /api/v1/public/user-dashboard/alerts?district=&type=&limit=`
10. `GET /api/v1/public/user-dashboard/alerts/trend?district=&months=12`

#### Profile API
11. `GET /api/v1/common-user/me`

---

## Step 6 - Input Validation and Error Contract

### Standard error shape
Use this format on all handlers:
- `code`
- `message`
- `details`

Example:
{
  "code": "INVALID_INPUT",
  "message": "latitude must be between -90 and 90",
  "details": {"field": "latitude"}
}

### Required validations
1. Detect payload
- invalid lat/lon rejected with 400

2. Complaint payload
- min description length
- valid enum mapping for type/severity

3. Pagination
- page >= 1
- 1 <= limit <= 100

4. Tracking number
- format regex like `^R-[0-9]{4,8}$`

---

## Step 7 - Redis Caching Plan

### Cache keys and TTL
1. Home overview
- key: `ud:overview:{district}`
- ttl: 10m

2. Home latest alerts
- key: `ud:alerts:latest:{district}:{limit}`
- ttl: 5m

3. Map wells
- key: `ud:map:{district}:{risk}:{limit}`
- ttl: 10m

4. Predict
- key: `ud:predict:{latRound}:{lonRound}:{monthBucket}`
- ttl: 30m

### Cache policy
- Read-through cache
- On write events (new alert, complaint, prediction), invalidate affected keys

---

## Step 8 - Seed Data and Local Readiness

### Create file
- `backend/migrations/seed_local.sql`

### Must include
1. Sample wells and readings across Vidarbha districts.
2. At least 8 alerts with mixed severities.
3. Sample citizen users.
4. Sample complaints with different statuses.
5. Sample district stats rows.

### Success criteria
- Dashboard can render all sections with local data without manual inserts.

---

## Step 9 - Tests (Mandatory)

### Service tests
- `backend/internal/dashboard/common_user/service/*_test.go`

Cover:
1. Risk normalization rules.
2. Prediction fallback logic.
3. Complaint tracking number uniqueness loop.
4. Complaint status transition guard.

### Handler tests
- `backend/internal/dashboard/common_user/handler/*_test.go`

Cover:
1. Success and invalid input status codes.
2. Response shape contract.
3. Auth gate behavior for citizen routes.
4. Public routes accessible without token.

### Repository tests
- Use test DB for SQL correctness and null-handling.

---

## Step 10 - Frontend Integration by dashboard-user.html Sections

## 10.1 Global initialization
Replace static startup assumptions with API bootstrap:
1. On load, call overview + alerts + districts.
2. Store payload in state object.
3. Render cards and tables using returned data.

## 10.2 Home section wiring
Map API fields to existing elements:
1. Water level now card value.
2. Active alerts badge count.
3. Meter section depth/risk text.
4. Latest alerts list cards.
5. District rows table body.

## 10.3 Detect section wiring
Replace `runDetection()` random simulation:
1. Geolocation success -> call predict API.
2. Fill result hero fields from response.
3. Build timeline from `multi_month_forecast`.
4. Render history chart from API series.
5. Render SHAP chart from API `shap_features`.

## 10.4 Map section wiring
Replace hardcoded wells array:
1. Fetch map wells API once on page entry.
2. Render markers with risk-based colors and radius.
3. Populate popup from API fields.

## 10.5 Report Problem section wiring
Replace `submitComplaint()` alert-only behavior:
1. Read form values.
2. Call create complaint API.
3. Show returned tracking number in success modal.
4. Optionally reset form.

## 10.6 Track Complaint section wiring
1. Search input -> call track endpoint.
2. Render single complaint detail card/table row.
3. On page open, call `complaints/mine` and render list.

## 10.7 Alerts section wiring
1. Fetch alerts list for cards.
2. Fetch trend data for chart.
3. Add district/type filters if needed.

---

## Step 11 - Security and Abuse Controls

1. Rate limit public predict endpoint.
2. Rate limit complaint create per user/IP.
3. Enforce role guard for `/api/v1/common-user/*`.
4. Do not return sensitive internal fields in responses.
5. Add request body size limits.

---

## Step 12 - Observability and Metrics

1. Add middleware metrics for request count, latency, status code.
2. Add business metrics:
- predictions requested
- fallback predictions used
- complaints created
- alerts served

3. Add structured logs with request id.

---

## Step 13 - Performance and Load Checks

1. Smoke script for user endpoints.
2. Verify cache hit rate.
3. Verify p95 latency target:
- read endpoints < 300ms
- predict endpoint < 1200ms (with model)

---

## Step 14 - Deployment and Runtime Verification

1. Verify with docker compose:
- app starts
- DB migrations applied
- Redis reachable
- model service reachable

2. Verify environment variables are set in runtime.
3. Verify CORS and auth headers from frontend origin.

---

## Step 15 - Final QA Checklist (Release Gate)

All must pass:
1. Home page loads real data.
2. Detect page uses geolocation and returns real prediction.
3. Map page shows API-based markers.
4. Complaint create returns valid tracking number.
5. Track complaint works for valid and invalid numbers.
6. Alerts list and trend are dynamic.
7. All tests pass (`go test ./...`).
8. No mock/random logic remains in production path.

---

## Step 16 - Definition of Done

User dashboard is complete when:
1. All dashboard-user.html sections are backed by real APIs.
2. Public and citizen endpoint split is implemented and tested.
3. Prediction is model-integrated with fallback and persistence.
4. Complaint lifecycle is persistent and trackable.
5. Caching, validation, security, and tests are in place.
6. Local and docker runtime both work end-to-end.

---

## API Contracts (Reference Payloads)

### A. Overview
GET `/api/v1/public/user-dashboard/overview`

Response:
{
  "current_depth_mbgl": 63.4,
  "active_alerts_count": 3,
  "district": "Amravati",
  "risk_status": "WARNING",
  "message": "Water is going down. Store water for 30+ days."
}

### B. Predict
POST `/api/v1/public/user-dashboard/predict`

Request:
{
  "latitude": 20.9312,
  "longitude": 77.7523
}

Response:
{
  "depth_mbgl": 58.3,
  "risk_level": "WARNING",
  "confidence_pct": 94,
  "prediction_path": "model",
  "recommendation": "Store extra water now",
  "actionable_advice": [
    "Store extra water",
    "Use drip irrigation",
    "Check tanker schedule"
  ],
  "multi_month_forecast": [
    {"month_offset": 1, "label": "Apr 2026", "depth_mbgl": 62.1, "risk_level": "WARNING", "confidence": 0.91},
    {"month_offset": 2, "label": "May 2026", "depth_mbgl": 68.5, "risk_level": "DANGER", "confidence": 0.89},
    {"month_offset": 3, "label": "Jun 2026", "depth_mbgl": 71.2, "risk_level": "DANGER", "confidence": 0.86}
  ],
  "shap_features": [
    {"feature": "rainfall_last_month", "impact": 0.32},
    {"feature": "prev_water_level", "impact": 0.28},
    {"feature": "elevation", "impact": 0.15}
  ]
}

### C. Map Wells
GET `/api/v1/public/user-dashboard/map/wells?district=Amravati&risk=warning&limit=100`

Response:
{
  "data": [
    {
      "name": "Amravati - Warud",
      "latitude": 20.93,
      "longitude": 77.78,
      "depth_mbgl": 63.4,
      "risk_level": "DANGER",
      "affected_families": 3800,
      "tanker_note": "Tanker Mon/Thu"
    }
  ]
}

### D. Create Complaint
POST `/api/v1/common-user/complaints`

Request:
{
  "type": "water_shortage",
  "district": "Amravati",
  "taluka": "Warud",
  "village": "Warud",
  "severity": "high",
  "description": "No tanker in 5 days and borewell dry."
}

Response:
{
  "tracking_number": "R-1042",
  "status": "submitted",
  "message": "Complaint created successfully"
}

### E. Track Complaint
GET `/api/v1/common-user/complaints/track/R-1042`

Response:
{
  "tracking_number": "R-1042",
  "status": "in_review",
  "district": "Amravati",
  "type": "water_shortage",
  "updated_at": "2026-03-19T09:45:00Z",
  "progress_note": "Officer assigned"
}

### F. Alerts Trend
GET `/api/v1/public/user-dashboard/alerts/trend?district=Amravati&months=12`

Response:
{
  "series": [
    {"label": "Oct 2025", "depth_mbgl": 48.0, "predicted": false},
    {"label": "Nov 2025", "depth_mbgl": 52.0, "predicted": false},
    {"label": "Apr 2026", "depth_mbgl": 66.0, "predicted": true}
  ]
}

---

## Execution Sequence Summary
1. Step 0 to 1: contracts and DTOs
2. Step 2 to 5: repository, service, handlers, routing
3. Step 6 to 9: validation, caching, seeds, tests
4. Step 10: frontend integration by page section
5. Step 11 to 14: security, metrics, load, deployment
6. Step 15 to 16: final QA and done criteria

This sequence must be followed in order to avoid rework and keep dashboard-user.html aligned with backend delivery.