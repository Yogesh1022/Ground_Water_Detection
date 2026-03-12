# AquaVidarbha — 10-Day, 2-Person Implementation Plan

> **Team:**
> - **Dev A (Backend & Infra Lead)** — Go server, DB, Docker, deployment
> - **Dev B (ML Integration & API Lead)** — Python ML service, gRPC, handlers, caching
>
> **Rule:** Both devs work in parallel on independent tracks. Sync at defined merge points (🔀) each day. All code merged to `main` via PRs with review from the other dev.

---

## Frontend Dashboards Driving This Plan

The backend must serve **3 role-based dashboards** + a public landing page + login:

| Dashboard | Role | Key Features |
|-----------|------|-------------|
| **User Dashboard** (`dashboard-user.html`) | `citizen` (no auth) | GPS water-level check, 3-month prediction timeline, SHAP explainability, interactive Leaflet map (24 wells), district table, complaint filing, complaint tracking, alerts feed |
| **Gov Dashboard** (`dashboard-gov.html`) | `gov` (auth) | Command center KPIs, citizen request management (assign/resolve/escalate), district analytics, 90-day AI forecasts, task assignment to field teams, tanker scheduling, PDF/CSV report generation, activity log |
| **Admin Dashboard** (`dashboard-admin.html`) | `admin` (auth) | Platform KPIs, registration/resolution analytics, system health monitoring, citizen CRUD (edit/suspend/activate), officer CRUD (edit/remove), add user/officer form, ML model registry & retrain trigger, data source overview, full audit log with IP, settings management (alert thresholds, retrain frequency) |
| **Landing Page** (`index.html`) | public | Three.js globe, feature bento grid, architecture diagram, tech stack, workflow |
| **Login Page** (`login.html`) | public | Role tabs (gov/admin), credential form, demo creds, session-based redirect |

---

## Workstream Overview

```
DAY   1     2     3     4     5     6     7     8     9     10
      ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃
A ━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫
      │Setup│ DB  │Repos│Spatl│Wells│Pred │Cache│GovAd│Docke│Prod
      │Infra│Migrn│Layer│KNN  │Cmpl │Orch │Tnkr │min  │rize │Fix
      ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃
B ━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫
      │Setup│Proto│Pyth │gRPC │Auth │Weath│Dist │Rprt │CI/CD│Prod
      │Conf │buf  │ML   │Clnt │3Role│Hndl │Alert│Test │Audit│Fix
      ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃
      🔀    🔀    🔀    🔀    🔀    🔀    🔀    🔀    🔀    🔀
     Merge Merge Merge Merge Merge Merge Merge Merge Merge SHIP
```

---

## Day 1 — Project Bootstrap & Infrastructure

### Dev A: Go Server + Docker Infra

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Install Go 1.22+, `protoc`, `air`, `migrate`, `golangci-lint` | — | ☐ |
| 2 | `go mod init github.com/team/aquavidarbha-backend` | `go.mod` | ☐ |
| 3 | Install all Go deps (gin, pgx, go-redis, grpc, zap, jwt, validator, viper) | `go.sum` | ☐ |
| 4 | Write `docker-compose.yml` — PostgreSQL+PostGIS, Redis | `docker-compose.yml` | ☐ |
| 5 | `docker compose up -d` — verify Postgres & Redis running | — | ☐ |
| 6 | Create `.env.example` with all env vars | `.env.example` | ☐ |
| 7 | Write `Makefile` (run, build, test, lint, migrate, proto, seed, docker) | `Makefile` | ☐ |
| 8 | Setup `air` config for hot-reload | `.air.toml` | ☐ |

### Dev B: Config, Logger & Server Skeleton

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write config loader (env-based struct including alert thresholds & retrain settings) | `internal/config/config.go` | ☐ |
| 2 | Write Zap logger setup (JSON, request_id, user_id, role fields) | `internal/middleware/logger.go` | ☐ |
| 3 | Write recovery middleware | `internal/middleware/recovery.go` | ☐ |
| 4 | Write CORS middleware | `internal/middleware/cors.go` | ☐ |
| 5 | Write `main.go` skeleton: load config → init logger → connect DB pool → connect Redis → setup Gin → graceful shutdown | `cmd/server/main.go` | ☐ |
| 6 | Write health check handler (`/health`, `/ready`) | `internal/handler/health.go` | ☐ |
| 7 | Write standard JSON response builder (with pagination meta) | `pkg/response/response.go` | ☐ |

### 🔀 Day 1 Merge Point
- **Verify:** `make run` starts server, `/health` returns `200 OK`, Postgres & Redis containers healthy
- **Both devs** pull merged `main` before starting Day 2

---

## Day 2 — Database Schema & Protobuf Contract

### Dev A: PostgreSQL Schema + Migrations

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Migration 001: `CREATE EXTENSION postgis` + `wells` table with spatial index | `migrations/001_create_wells.up.sql` | ☐ |
| 2 | Migration 002: `well_readings` table (30 columns, unique well_id+date) | `migrations/002_create_well_readings.up.sql` | ☐ |
| 3 | Migration 003: `predictions` history table with JSONB `nearest_wells`, `shap_features`, `multi_month_forecast` | `migrations/003_create_predictions.up.sql` | ☐ |
| 4 | Migration 004: `users` table (email, password_hash, role ENUM `citizen`/`gov`/`admin`, name, district, is_active) | `migrations/004_create_users.up.sql` | ☐ |
| 5 | Migration 005: `complaints` table (user_id, type, district, taluka, severity, description, status ENUM `open`/`in_review`/`in_progress`/`resolved`/`escalated`, assigned_officer_id, tracking_number, timestamps) | `migrations/005_create_complaints.up.sql` | ☐ |
| 6 | Migration 006: `alerts` table (type `critical`/`warning`/`info`/`success`, district, title, message, confidence_pct, source, created_at) | `migrations/006_create_alerts.up.sql` | ☐ |
| 7 | Migration 007: `tanker_routes` table (route_name, villages JSONB, schedule, capacity_liters, status, assigned_driver) | `migrations/007_create_tanker_routes.up.sql` | ☐ |
| 8 | Migration 008: `task_assignments` table (complaint_id, assignee_officer_id, due_date, priority, notes, status) | `migrations/008_create_task_assignments.up.sql` | ☐ |
| 9 | Migration 009: `audit_log` table (timestamp, actor_id, actor_role, action, target, details JSONB, ip_address) | `migrations/009_create_audit_log.up.sql` | ☐ |
| 10 | Migration 010: `system_settings` table (key, value JSONB) for alert thresholds/retrain frequency | `migrations/010_create_system_settings.up.sql` | ☐ |
| 11 | Write all `*.down.sql` rollback files | `migrations/00*_*.down.sql` | ☐ |
| 12 | Run `make migrate-up` — verify all tables exist | — | ☐ |

### Dev B: Protobuf Definition & Domain Models

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write `prediction.proto` — `PredictionRequest` (26 fields), `PredictionResponse` (depth, risk, confidence, per-model, SHAP top-7), `MultiMonthForecast` (3 months with per-month depth+risk), `ModelStatusResponse` (per-model readiness + metrics) | `proto/prediction.proto` | ☐ |
| 2 | Write `generate_proto.sh` for both Go + Python codegen | `scripts/generate_proto.sh` | ☐ |
| 3 | Generate Go proto stubs, verify compilation | `proto/ml/*.pb.go` | ☐ |
| 4 | Generate Python proto stubs | `ml-service/proto/*_pb2.py` | ☐ |
| 5 | Write all domain models: `Well`, `WellReading`, `PredictRequest`, `PredictResponse` (with `MultiMonthForecast`), `User` (3 roles), `District`, `Weather`, `Complaint`, `Alert`, `TankerRoute`, `TaskAssignment`, `AuditEntry`, `SystemSettings` | `internal/model/*.go` | ☐ |
| 6 | Write input validator (Vidarbha bounding box: 19.5–22.0°N, 75.5–81.0°E, complaint severity, user roles) | `pkg/validator/validator.go` | ☐ |
| 7 | Write seed script: parse CSV → bulk insert wells + readings; seed default admin + gov users; seed initial alerts | `scripts/seed.go` | ☐ |
| 8 | Run seed: all ~84K rows + 650 wells + default users imported | — | ☐ |

### 🔀 Day 2 Merge Point
- **Verify:** `make migrate-up` succeeds (10 migrations), `SELECT COUNT(*) FROM well_readings` = ~84K, complaints/alerts/tanker tables exist, proto compiles on both sides
- **Shared contract:** Both devs agree on proto + all domain model structs (including complaint, alerts, tanker, audit)

---

## Day 3 — Repository Layer & Python ML Service

### Dev A: Repository Implementations (PostgreSQL)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Well repo: `GetAll` (paginated), `GetByID`, `GetByDistrict` | `internal/repository/well_repo.go` | ☐ |
| 2 | Well repo: `FindKNearest` (PostGIS `<->` KNN operator, ST_DWithin) | `internal/repository/well_repo.go` | ☐ |
| 3 | Well repo: `GetLatestReading`, `GetReadings`, `Create`, `Update`, `BulkImport` | `internal/repository/well_repo.go` | ☐ |
| 4 | Prediction repo: `Store`, `GetByUser`, `GetStats`, `GetGlobalStats` (for admin KPIs) | `internal/repository/prediction_repo.go` | ☐ |
| 5 | User repo: `Create`, `GetByEmail`, `GetByID`, `GetAll` (filtered by role), `Update`, `SetActive` | `internal/repository/user_repo.go` | ☐ |
| 6 | District repo: `GetAll`, `GetByName` (with aggregates), `GetCrisisIndex` | `internal/repository/district_repo.go` | ☐ |
| 7 | Complaint repo: `Create`, `GetByID`, `GetByTrackingNumber`, `GetByUser`, `GetAll` (filtered/paginated), `UpdateStatus`, `AssignOfficer`, `Escalate`, `GetStats` | `internal/repository/complaint_repo.go` | ☐ |
| 8 | Alert repo: `Create`, `GetAll` (by district, type), `GetActive`, `GetByArea` | `internal/repository/alert_repo.go` | ☐ |
| 9 | Write materialized view `district_stats` + refresh function | `migrations/011_district_stats.up.sql` | ☐ |

### Dev B: Python ML Microservice (Complete)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Setup `ml-service/` project: `requirements.txt`, Dockerfile structure | `ml-service/requirements.txt` | ☐ |
| 2 | Write model registry: load XGBoost, LSTM (with custom AttnSoftmax/AttnContext), Random Forest at startup; expose per-model metrics (R², RMSE, MAE, version, status) for admin dashboard | `ml-service/app/model_registry.py` | ☐ |
| 3 | Write feature pipeline: proto fields → ordered numpy array (25 features), MinMaxScaler for DL models | `ml-service/app/feature_pipeline.py` | ☐ |
| 4 | Write ensemble logic: XGB(0.30)+LSTM(0.25)+CNN-LSTM(0.20)+GRU(0.15)+1D-CNN(0.10) | `ml-service/app/service.py` | ☐ |
| 5 | Write **multi-month forecast**: run ensemble for current+3 future months, return per-month depth+risk (drives the 3-month prediction timeline in user dashboard) | `ml-service/app/service.py` | ☐ |
| 6 | Write SHAP explainer: top-7 feature importance per prediction (labels: "Last Month Rain", "Previous Water Level", "Height Above Sea", "Location", "Temperature", "Greenery (NDVI)", "Soil Type") matching dashboard chart | `ml-service/app/explainer.py` | ☐ |
| 7 | Write risk classifier: SAFE (<35m) / MODERATE (35–50m) / WARNING (50–65m) / DANGER (>65m) from depth_mbgl — matching dashboard color coding | `ml-service/app/config.py` | ☐ |
| 8 | Write gRPC server: `Predict()` (returns single + 3-month forecast), `ModelStatus()` (full registry info for admin) RPCs | `ml-service/app/server.py` | ☐ |
| 9 | Test with `grpcurl`: send sample request, get valid prediction + multi-month response | — | ☐ |

### 🔀 Day 3 Merge Point
- **Verify:** `FindKNearest(21.15, 79.09, 5, 50)` returns 5 wells sorted by distance. Complaint repo CRUD works. Python gRPC returns single prediction + 3-month forecast + SHAP
- **Key contract:** Repo interfaces frozen — services build on top from Day 4

---

## Day 4 — Spatial Service, gRPC Client & Auth (3 Roles)

### Dev A: Spatial Service (KNN + IDW — the brain)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write KNN service: call `well_repo.FindKNearest`, fetch latest readings for each | `internal/service/spatial.go` | ☐ |
| 2 | Write IDW interpolation: `weight_i = 1/dist_i²`, weighted average of depth_lag_1q, depth_lag_2q, etc. | `internal/spatial/idw.go` | ☐ |
| 3 | Implement 3-path routing logic: EXACT_WELL (<1km) / IDW_INTERPOLATED (3+ wells) / ENVIRONMENTAL_ONLY (<3 wells) | `internal/service/spatial.go` | ☐ |
| 4 | Write well service: `ListAll`, `GetByID`, `GetReadings`, `Create`, `Update`, `BulkImport` | `internal/service/well.go` | ☐ |
| 5 | Unit tests: IDW math (weights sum to 1, closer=higher weight), path routing edge cases | `internal/spatial/idw_test.go`, `internal/service/spatial_test.go` | ☐ |

### Dev B: Go gRPC Client + 3-Role Auth Service

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write gRPC client: connect with keepalive, 5s timeout, `Predict()` (with multi-month), `ModelStatus()` | `internal/grpcclient/ml_client.go` | ☐ |
| 2 | Test Go gRPC client → Python ML service end-to-end (hardcoded features → valid response with 3-month forecast) | `internal/grpcclient/ml_client_test.go` | ☐ |
| 3 | Write auth service with **3 roles**: `Register` (citizen self-register, bcrypt cost 12), `Login` (verify + issue JWT HS256 with role claim), `CreateOfficer` (admin-only), `CreateUser` (admin-only) | `internal/service/auth.go` | ☐ |
| 4 | Write JWT middleware: extract Bearer token, validate, inject user_id+role+name into `gin.Context` | `internal/middleware/auth.go` | ☐ |
| 5 | Write role middleware: `RequireRole("gov")`, `RequireRole("admin")`, `RequireAnyRole("gov","admin")` | `internal/middleware/auth.go` | ☐ |
| 6 | Write **audit log middleware**: record action, actor, target, IP address to `audit_log` table on every write operation | `internal/middleware/audit.go` | ☐ |
| 7 | Write rate limiter middleware (token bucket per IP, Redis-backed) | `internal/middleware/ratelimit.go` | ☐ |
| 8 | Unit tests: JWT expiry, invalid signature, 3-role check, audit log recording | `internal/middleware/*_test.go` | ☐ |

### 🔀 Day 4 Merge Point
- **Verify:** Go gRPC client calls Python ML service and gets single + 3-month prediction. Spatial IDW returns interpolated depths. JWT flow works for citizen/gov/admin roles. Audit log captures write operations.
- **Critical integration:** gRPC connection is the bridge between Go and Python — both devs test this together

---

## Day 5 — Core Handlers: Predict, Wells, Complaints, Auth

### Dev A: Well Handlers + Predict Handler + Complaint Handlers

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `GET /api/v1/wells` — paginated list with district filter (for map: lat, lon, depth, prediction, affected families, tanker info) | `internal/handler/well.go` | ☐ |
| 2 | `GET /api/v1/wells/:id` — single well with latest reading | `internal/handler/well.go` | ☐ |
| 3 | `GET /api/v1/wells/:id/readings` — well reading history (limit param) | `internal/handler/well.go` | ☐ |
| 4 | `POST /api/v1/predict` — validate GPS input → call prediction orchestrator → return: depth, risk, confidence, rainfall, soil type, 3-month forecast, SHAP top-7, nearest wells (drives user dashboard "Check Water Level" page) | `internal/handler/predict.go` | ☐ |
| 5 | `POST /api/v1/complaints` — submit complaint (type, district, taluka, severity, description) → generate tracking number `R-XXXX` → return it (drives user dashboard "Report Problem" page) | `internal/handler/complaint.go` | ☐ |
| 6 | `GET /api/v1/complaints/track/:number` — lookup by tracking number (user dashboard "Track Complaint" page) | `internal/handler/complaint.go` | ☐ |
| 7 | `GET /api/v1/complaints/mine` — list current user's complaints with status badges (user dashboard "Track Complaint" table) | `internal/handler/complaint.go` | ☐ |
| 8 | Write router setup: public routes, citizen routes, gov routes, admin routes — apply role middleware per group | `internal/handler/router.go` | ☐ |

### Dev B: Auth Handler + Weather Service + District Summary + Alerts

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `POST /api/v1/auth/login` — verify creds, return JWT + role + name (drives `login.html` → redirect to role-specific dashboard) | `internal/handler/auth.go` | ☐ |
| 2 | `POST /api/v1/auth/register` — citizen self-register, return JWT | `internal/handler/auth.go` | ☐ |
| 3 | Write weather service: fetch Open-Meteo API, compute rolling/deficit features | `internal/service/weather.go` | ☐ |
| 4 | `GET /api/v1/weather/:lat/:lon` — return live weather + derived features | `internal/handler/weather.go` | ☐ |
| 5 | `GET /api/v1/districts/summary` — list all 11 districts with: water level, trend (going up/down/stable), risk status — drives user dashboard "Water Level in All Districts" table | `internal/handler/district.go` | ☐ |
| 6 | `GET /api/v1/alerts` — return area-specific alerts (critical/warning/info/success) with title, message, confidence, source, timestamp — drives user dashboard "Alerts" page & home alert cards | `internal/handler/alert.go` | ☐ |
| 7 | `GET /api/v1/models/status` — call gRPC `ModelStatus()`, return per-model readiness + metrics | `internal/handler/model_status.go` | ☐ |
| 8 | Write request ID middleware (UUID per request for tracing) | `internal/middleware/requestid.go` | ☐ |

### 🔀 Day 5 Merge Point
- **Verify with curl:**
  - `POST /api/v1/auth/login` with gov creds → JWT with role=gov
  - `POST /api/v1/predict` → full response: depth, risk, confidence, 3-month forecast, SHAP, nearest wells
  - `POST /api/v1/complaints` → tracking number `R-1234`
  - `GET /api/v1/complaints/track/R-1234` → complaint details with status
  - `GET /api/v1/districts/summary` → all districts with water level, trend, risk
  - `GET /api/v1/alerts` → alert feed
- **Milestone:** User dashboard is fully backed by API (all 6 pages: Home, Check Water Level, Water Map, Report Problem, Track Complaint, Alerts)

---

## Day 6 — Prediction Orchestrator & Gov Dashboard APIs

### Dev A: Prediction Orchestrator Service (ties everything together)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write `PredictionService.Predict()`: spatial→weather→buildGRPCReq→callML→buildResponse with multi-month forecast | `internal/service/prediction.go` | ☐ |
| 2 | Build 25-feature gRPC request from spatial interpolation + weather data + request params. Call ML for current month + 3 future months | `internal/service/prediction.go` | ☐ |
| 3 | Generate recommendation text + actionable advice list from risk_level + month (matching dashboard advice box: "Store extra water", "Use drip irrigation", etc.) | `internal/service/prediction.go` | ☐ |
| 4 | Auto-create alert when prediction risk = DANGER for a district (feeds user dashboard alerts) | `internal/service/prediction.go` | ☐ |
| 5 | Store prediction to DB asynchronously with SHAP features + multi-month forecast (`go s.predRepo.Store(...)`) | `internal/service/prediction.go` | ☐ |
| 6 | Integration test: real DB + real Python ML = valid prediction with 3-month outlook | `internal/service/prediction_test.go` | ☐ |

### Dev B: Gov Dashboard — Request Management & Analytics

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `GET /api/v1/gov/overview` — KPIs: open requests, in-progress, resolved, critical zones count, active tankers (drives gov "Command Center" 5 stat cards) | `internal/handler/gov.go` | ☐ |
| 2 | `GET /api/v1/gov/requests` — all citizen complaints with filters (status: all/open/in_review/critical/resolved), paginated (drives gov "All Requests" table with filter pills) | `internal/handler/gov.go` | ☐ |
| 3 | `PUT /api/v1/gov/requests/:id/assign` — assign complaint to officer (drives gov task assignment) | `internal/handler/gov.go` | ☐ |
| 4 | `PUT /api/v1/gov/requests/:id/resolve` — mark complaint resolved | `internal/handler/gov.go` | ☐ |
| 5 | `PUT /api/v1/gov/requests/:id/escalate` — escalate to District Collector | `internal/handler/gov.go` | ☐ |
| 6 | `GET /api/v1/gov/districts/analytics` — per-district: GW depth, change, wells count, risk, crisis index (drives gov "District Analytics" charts: bar + scatter) | `internal/handler/gov.go` | ☐ |
| 7 | `GET /api/v1/gov/forecast` — 90-day ensemble forecast with confidence band (drives gov "AI Forecasts" line chart) | `internal/handler/gov.go` | ☐ |
| 8 | `GET /api/v1/gov/crisis-zones` — predicted crisis zones: current vs predicted depth, confidence %, recommended actions (drives gov "AI Forecasts" crisis table) | `internal/handler/gov.go` | ☐ |

### 🔀 Day 6 Merge Point
- **Verify:** Full prediction orchestrator: `POST /predict {lat, lon}` → spatial lookup → weather fetch → gRPC call → complete JSON response with risk_level, confidence, 3-month forecast, SHAP, recommendation, nearest_wells. Gov overview KPIs work. Request assignment/resolve/escalate works. District analytics returns crisis index.
- **Milestone:** Core prediction + gov command center are DONE

---

## Day 7 — Redis Caching, Tanker Management & Alerts

### Dev A: Redis Caching Layer + Tanker Management

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write Redis cache wrapper: `Get`, `Set`, `Delete` with JSON marshal/unmarshal | `internal/cache/redis.go` | ☐ |
| 2 | Cache predictions: key=`pred:{lat}:{lon}:{month}:{year}`, TTL=1hr | `internal/service/prediction.go` | ☐ |
| 3 | Cache district stats: key=`district:{name}:stats`, TTL=15min | `internal/service/district.go` | ☐ |
| 4 | Cache well list: key=`wells:all`, TTL=5min | `internal/service/well.go` | ☐ |
| 5 | Tanker repo: `GetAll`, `GetByStatus`, `Create`, `Update` | `internal/repository/tanker_repo.go` | ☐ |
| 6 | `GET /api/v1/gov/tankers` — active tanker routes: route name, villages, schedule, capacity, status (drives gov "Tanker Schedule" table) | `internal/handler/gov_tanker.go` | ☐ |
| 7 | `POST /api/v1/gov/tankers` — create/update tanker route | `internal/handler/gov_tanker.go` | ☐ |
| 8 | Benchmark: verify cache-hit prediction < 5ms, cache-miss < 400ms | — | ☐ |

### Dev B: WebSocket Alerts + Gov Task Assignment + Activity Log

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write WebSocket hub: manage connections, subscribe to topics (all / district / role) | `internal/handler/ws.go` | ☐ |
| 2 | Write notifier service: broadcast alert to subscribers when CRITICAL/DANGER prediction; also notify when complaint status changes | `internal/service/notifier.go` | ☐ |
| 3 | Integrate notifier into prediction orchestrator (after risk_level classified) | `internal/service/prediction.go` | ☐ |
| 4 | `POST /api/v1/gov/tasks` — create task assignment: report ID, assignee, due date, priority, notes (drives gov "Task Assignment" form) | `internal/handler/gov_task.go` | ☐ |
| 5 | `GET /api/v1/gov/teams/workload` — per-officer: active tasks, completed tasks (drives gov workload chart) | `internal/handler/gov_task.go` | ☐ |
| 6 | `GET /api/v1/gov/activity-log` — timestamped system events: predictions, requests, assignments (drives gov "Activity Log" table) | `internal/handler/gov_activity.go` | ☐ |
| 7 | Test with `wscat`: connect, subscribe, trigger prediction, receive alert | — | ☐ |

### 🔀 Day 7 Merge Point
- **Verify:** Cache-hit prediction <5ms. WebSocket client receives CRITICAL alert. Gov tanker routes CRUD works. Task assignment creates entry. Activity log returns events.
- **Milestone:** User + Gov dashboards fully backed by API

---

## Day 8 — Admin Dashboard APIs & Report Generation

### Dev A: Admin Dashboard Handlers

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `GET /api/v1/admin/overview` — platform KPIs: total citizens, gov officers, open reports, wells monitored, model R² (drives admin "System Overview" 5 stat cards) | `internal/handler/admin.go` | ☐ |
| 2 | `GET /api/v1/admin/analytics` — registration trends (30d), resolution trends, district request volumes (drives admin "Analytics" charts) | `internal/handler/admin.go` | ☐ |
| 3 | `GET /api/v1/admin/users` — citizen list with search (name/email) & district filter, paginated (drives admin "Manage Citizens" table) | `internal/handler/admin.go` | ☐ |
| 4 | `PUT /api/v1/admin/users/:id` — edit citizen profile | `internal/handler/admin.go` | ☐ |
| 5 | `PUT /api/v1/admin/users/:id/suspend` — suspend citizen account | `internal/handler/admin.go` | ☐ |
| 6 | `PUT /api/v1/admin/users/:id/activate` — reactivate citizen account | `internal/handler/admin.go` | ☐ |
| 7 | `GET /api/v1/admin/officers` — officer list (drives admin "Manage Officers" table) | `internal/handler/admin.go` | ☐ |
| 8 | `POST /api/v1/admin/users` — create new citizen or officer account (drives admin "Add User / Officer" form with account type toggle) | `internal/handler/admin.go` | ☐ |
| 9 | `DELETE /api/v1/admin/officers/:id` — remove officer account | `internal/handler/admin.go` | ☐ |
| 10 | `POST /api/v1/admin/wells/import` — bulk CSV upload (multipart form) | `internal/handler/admin.go` | ☐ |

### Dev B: Admin ML Stats, Audit Log, Settings & Gov Reports

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `GET /api/v1/admin/models` — ML model registry: model name, version, R², RMSE, MAE, status (Production/Backup/Testing) (drives admin "ML Model Stats" table + radar chart) | `internal/handler/admin_ml.go` | ☐ |
| 2 | `POST /api/v1/admin/models/retrain` — trigger model retrain (drives admin retrain button) | `internal/handler/admin_ml.go` | ☐ |
| 3 | `GET /api/v1/admin/health` — system component statuses: ML Engine, Database, Pipeline, Alert System, API Gateway, Backup (drives admin "System Health" dashboard with progress bars) | `internal/handler/admin_health.go` | ☐ |
| 4 | `GET /api/v1/admin/data-sources` — data source inventory: source name, type, record count, update frequency, coverage, quality score (drives admin "Data Overview" table) | `internal/handler/admin_data.go` | ☐ |
| 5 | `GET /api/v1/admin/activity-log` — full audit log: timestamp, actor, role, action, target, details, IP address. Searchable (drives admin "Activity Logs" table) | `internal/handler/admin_audit.go` | ☐ |
| 6 | `GET /api/v1/admin/settings` — current system settings (alert thresholds, retrain frequency) (drives admin "Settings" form) | `internal/handler/admin_settings.go` | ☐ |
| 7 | `PUT /api/v1/admin/settings` — update thresholds: critical depth, high risk depth, forecast horizon, retrain frequency | `internal/handler/admin_settings.go` | ☐ |
| 8 | `GET /api/v1/gov/reports/monthly-status` — generate monthly status PDF | `internal/handler/gov_reports.go` | ☐ |
| 9 | `GET /api/v1/gov/reports/ai-prediction` — generate AI prediction summary PDF | `internal/handler/gov_reports.go` | ☐ |
| 10 | `GET /api/v1/gov/reports/citizen-requests` — generate citizen requests CSV export (drives gov "Generate Reports" 3 cards) | `internal/handler/gov_reports.go` | ☐ |

### 🔀 Day 8 Merge Point
- **Verify:** Admin endpoints: users CRUD (create/edit/suspend/activate), officers CRUD, model registry, audit log, settings. Gov reports generate PDF/CSV. All admin + gov dashboard features have API backing.
- **Milestone:** All 3 dashboards (user + gov + admin) fully backed by API

---

## Day 9 — Dockerization & CI/CD

### Dev A: Docker Build & Production Compose

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write Go multi-stage Dockerfile (builder → alpine, ~15MB binary) | `Dockerfile` | ☐ |
| 2 | Write Python ML Dockerfile (python:3.11-slim, copy models) | `ml-service/Dockerfile` | ☐ |
| 3 | Write production `docker-compose.yml` (gateway, ml-service, postgres, redis, nginx) | `docker-compose.prod.yml` | ☐ |
| 4 | Write NGINX config: reverse proxy `/api/*` → Go, serve frontend v2 static files, WebSocket upgrade for `/ws` | `nginx.conf` | ☐ |
| 5 | Copy `frontend/v2/` into NGINX static dir — verify all 5 pages load (`index.html`, `login.html`, `dashboard-user.html`, `dashboard-gov.html`, `dashboard-admin.html`) | — | ☐ |
| 6 | Test `docker compose -f docker-compose.prod.yml up` — full stack boots, `/health` works | — | ☐ |
| 7 | Add healthchecks for all services in compose | `docker-compose.prod.yml` | ☐ |

### Dev B: CI/CD Pipeline + Observability

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write GitHub Actions CI: lint → test → build (with postgres+redis services) | `.github/workflows/ci.yml` | ☐ |
| 2 | Add Prometheus metrics endpoint (`/metrics`): request count, latency histogram, cache hits, complaints created/resolved | `internal/middleware/metrics.go` | ☐ |
| 3 | Add key metrics: `prediction_latency_seconds`, `grpc_call_duration`, `cache_hit_ratio`, `active_complaints`, `alerts_created` | `internal/middleware/metrics.go` | ☐ |
| 4 | Write unit tests: all handlers (mock services, test HTTP status codes, response format) for user, gov, admin routes | `internal/handler/*_test.go` | ☐ |
| 5 | Write unit tests: complaint service, alert service, tanker service, auth 3-role logic | `internal/service/*_test.go` | ☐ |
| 6 | Python: test feature pipeline + ensemble math + multi-month forecast + SHAP | `ml-service/tests/` | ☐ |
| 7 | Run `go test ./... -cover` — target >75% coverage | — | ☐ |
| 8 | Push to GitHub, verify CI passes green | — | ☐ |

### 🔀 Day 9 Merge Point
- **Verify:** `docker compose up` → entire stack runs. All 5 frontend pages served. CI pipeline passes. `/metrics` returns Prometheus data. Tests >75% coverage.

---

## Day 10 — Polish, Load Test & Ship

### Dev A: Performance & Production Hardening

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run load test: 100 concurrent prediction requests — all return <500ms | — | ☐ |
| 2 | Tune PostgreSQL connection pool (max_conns based on load test) | `internal/config/config.go` | ☐ |
| 3 | Add db connection pool metrics to health/ready endpoint | `internal/handler/health.go` | ☐ |
| 4 | Verify graceful shutdown: send SIGTERM during load → all in-flight complete | — | ☐ |
| 5 | Security audit: no hardcoded secrets, all env-based, bcrypt cost=12, JWT secret ≥32 chars, role checks on all gov/admin endpoints | — | ☐ |
| 6 | Write `.env.production` template with all required vars documented | `.env.production.example` | ☐ |

### Dev B: Frontend Integration & Final E2E Test

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Wire `dashboard-user.html` JS to real API: `useMyLocation()` → `POST /api/v1/predict`, district table → `GET /api/v1/districts/summary`, alerts → `GET /api/v1/alerts`, complaints → `POST /api/v1/complaints` | `frontend/v2/dashboard-user.html` | ☐ |
| 2 | Wire `login.html` to `POST /api/v1/auth/login` — store JWT in sessionStorage, redirect by role | `frontend/v2/login.html` | ☐ |
| 3 | Wire `dashboard-gov.html` JS to real API: overview → `/gov/overview`, requests → `/gov/requests`, tankers → `/gov/tankers`, tasks → `/gov/tasks` | `frontend/v2/dashboard-gov.html` | ☐ |
| 4 | Wire `dashboard-admin.html` JS to real API: users → `/admin/users`, officers → `/admin/officers`, models → `/admin/models`, health → `/admin/health`, audit → `/admin/activity-log`, settings → `/admin/settings` | `frontend/v2/dashboard-admin.html` | ☐ |
| 5 | Full E2E smoke test: citizen predicts → files complaint → gov assigns → resolves → admin views audit log → all dashboards reflect state | — | ☐ |
| 6 | Write API README: endpoints, auth flow, example curl for every endpoint across all 3 roles | `README.md` | ☐ |
| 7 | Tag `v1.0.0` release | — | ☐ |

### 🔀 Day 10 Merge Point — SHIP 🚀
- **Verify:** Full stack running in Docker. All 5 frontend pages connected to real API. Citizen flow works end-to-end. Gov officer can manage requests + tankers. Admin can manage users + view audit log. Load test passes. CI green.

---

## Daily Standup Template (5 min)

```
Both devs sync for 5 minutes at start of day:

1. What I completed yesterday (show merged PR)
2. What I'm doing today (reference this plan)
3. Any blockers (especially shared interfaces or contracts)
```

---

## Merge Protocol

```
1. Branch naming: feat/day{N}-{devletter}-{description}
   Example: feat/day3-a-spatial-knn

2. PR must include:
   - ✅ Passes `make lint`
   - ✅ Passes `make test`
   - ✅ Brief description of what changed
   - ✅ Reviewed by the other dev (quick look, not gatekeeping)

3. Merge to `main` at end of each day (both PRs)
4. Both devs pull `main` before starting next day
```

---

## Shared Contracts (FREEZE after Day 2)

These interfaces are shared between both devs. Finalize on Day 2, don't change without both agreeing:

### 1. Proto Contract (`prediction.proto`)
```
PredictionRequest   → 26 fields (features + path hint)
PredictionResponse  → depth, risk, confidence, per-model results, SHAP top-7, explanation
MultiMonthForecast  → [{month, year, depth_mbgl, risk_level}] x 3 future months
ModelStatusResponse → per-model: name, version, r2, rmse, mae, status (Production/Backup/Testing)
```

### 2. Domain Model Structs (`internal/model/`)
```go
// Core prediction
PredictRequest    {Latitude, Longitude, Month, Year}
PredictResponse   {DepthMBGL, DepthFeet, RiskLevel, Confidence, ModelSource, Explanation,
                   Recommendation, NearestWells, LatencyMs, Rainfall, SoilType,
                   MultiMonthForecast []MonthForecast, ShapFeatures []ShapFeature}
MonthForecast     {Month, Year, DepthMBGL, RiskLevel}
ShapFeature       {Name, Importance}  // top 7

// Users & Auth (3 roles)
User              {ID, Email, PasswordHash, Name, Role("citizen"/"gov"/"admin"),
                   District, IsActive, CreatedAt}

// Wells
Well              {WellID, District, Latitude, Longitude, ElevationM, SlopeDegree,
                   AffectedFamilies, TankerInfo}

// Complaints (citizen→gov workflow)
Complaint         {ID, TrackingNumber, UserID, Type, District, Taluka, Severity,
                   Description, Status, AssignedOfficerID, OfficerNote, CreatedAt, UpdatedAt}

// Gov operations
TankerRoute       {ID, RouteName, Villages, Schedule, CapacityLiters, Status, AssignedDriver}
TaskAssignment    {ID, ComplaintID, AssigneeID, DueDate, Priority, Notes, Status}

// Alerts
Alert             {ID, Type("critical"/"warning"/"info"/"success"), District, Title,
                   Message, ConfidencePct, Source, CreatedAt}

// Admin
AuditEntry        {Timestamp, ActorID, ActorRole, Action, Target, Details, IPAddress}
SystemSettings    {CriticalDepthM, HighRiskDepthM, ForecastHorizonDays, RetrainFrequency}
```

### 3. Repository Interfaces
```go
WellRepository       → GetAll, GetByID, GetByDistrict, FindKNearest, GetLatestReading,
                        GetReadings, Create, Update, BulkImport
PredictionRepository → Store, GetByUser, GetStats, GetGlobalStats
UserRepository       → Create, GetByEmail, GetByID, GetAll(role filter), Update, SetActive
DistrictRepository   → GetAll, GetByName, GetCrisisIndex
ComplaintRepository  → Create, GetByID, GetByTrackingNumber, GetByUser, GetAll(filter/page),
                        UpdateStatus, AssignOfficer, Escalate, GetStats
AlertRepository      → Create, GetAll(district/type filter), GetActive, GetByArea
TankerRepository     → GetAll, GetByStatus, Create, Update
TaskRepository       → Create, GetByOfficer, GetWorkload, Update
AuditRepository      → Create, GetAll(search/filter), GetByActor
SettingsRepository   → Get, Update
```

### 4. Service Interfaces
```go
SpatialService     → FindNeighbors(lat, lon) → ([]NearestWell, path)
                     InterpolateFeatures(neighbors) → InterpolatedFeatures
WeatherService     → GetFeatures(lat, lon, month, year) → WeatherFeatures
PredictionService  → Predict(ctx, PredictRequest) → PredictResponse (with 3-month forecast)
AuthService        → Register(email, pass, name) → JWT
                     Login(email, pass) → JWT (with role claim)
                     CreateUser(admin, email, pass, name, role, district) → User
ComplaintService   → Submit(userID, complaint) → trackingNumber
                     Track(trackingNumber) → Complaint
                     ListByUser(userID) → []Complaint
                     ListAll(filters) → []Complaint  (gov)
                     Assign(complaintID, officerID) → void  (gov)
                     Resolve(complaintID, note) → void  (gov)
                     Escalate(complaintID) → void  (gov)
AlertService       → GetAlerts(district) → []Alert
                     CreateFromPrediction(prediction) → Alert  (auto)
TankerService      → ListRoutes() → []TankerRoute  (gov)
                     CreateRoute(route) → TankerRoute  (gov)
TaskService        → Assign(task) → TaskAssignment  (gov)
                     GetWorkload() → []OfficerWorkload  (gov)
AdminService       → GetOverview() → AdminKPIs
                     GetAnalytics() → AnalyticsData
                     GetHealth() → []ComponentStatus
                     GetAuditLog(filters) → []AuditEntry
                     GetSettings() → SystemSettings
                     UpdateSettings(settings) → SystemSettings
```

---

## Complete API Surface

### Public (no auth)
| Method | Endpoint | Dashboard | Purpose |
|--------|----------|-----------|---------|
| POST | `/api/v1/auth/login` | login.html | Login → JWT with role |
| POST | `/api/v1/auth/register` | — | Citizen self-register |

### Citizen (no auth or citizen JWT)
| Method | Endpoint | Dashboard Page | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/v1/predict` | User → Check Water Level | GPS prediction + 3mo forecast + SHAP |
| GET | `/api/v1/wells` | User → Water Map | All wells for Leaflet map |
| GET | `/api/v1/wells/:id` | User → Water Map popup | Single well details |
| GET | `/api/v1/districts/summary` | User → Home table | District water levels + trends |
| POST | `/api/v1/complaints` | User → Report Problem | Submit complaint |
| GET | `/api/v1/complaints/track/:number` | User → Track Complaint | Lookup by tracking number |
| GET | `/api/v1/complaints/mine` | User → Track Complaint | User's complaint list |
| GET | `/api/v1/alerts` | User → Alerts & Home | Area-specific alert feed |
| GET | `/api/v1/weather/:lat/:lon` | User → Check Water Level | Live weather features |

### Government Officer (role=gov)
| Method | Endpoint | Dashboard Page | Purpose |
|--------|----------|---------------|---------|
| GET | `/api/v1/gov/overview` | Gov → Command Center | 5 KPI stats |
| GET | `/api/v1/gov/requests` | Gov → All Requests | Filtered/paginated complaints |
| PUT | `/api/v1/gov/requests/:id/assign` | Gov → All Requests | Assign to officer |
| PUT | `/api/v1/gov/requests/:id/resolve` | Gov → All Requests | Mark resolved |
| PUT | `/api/v1/gov/requests/:id/escalate` | Gov → All Requests | Escalate to DC |
| GET | `/api/v1/gov/districts/analytics` | Gov → District Analytics | GW levels, crisis index |
| GET | `/api/v1/gov/forecast` | Gov → AI Forecasts | 90-day forecast chart data |
| GET | `/api/v1/gov/crisis-zones` | Gov → AI Forecasts | Crisis prediction table |
| POST | `/api/v1/gov/tasks` | Gov → Task Assignment | Create task |
| GET | `/api/v1/gov/teams/workload` | Gov → Task Assignment | Officer workload chart |
| GET | `/api/v1/gov/tankers` | Gov → Tanker Schedule | Tanker routes table |
| POST | `/api/v1/gov/tankers` | Gov → Tanker Schedule | Create/update route |
| GET | `/api/v1/gov/reports/*` | Gov → Generate Reports | PDF/CSV reports (3 types) |
| GET | `/api/v1/gov/activity-log` | Gov → Activity Log | System events feed |

### Administrator (role=admin)
| Method | Endpoint | Dashboard Page | Purpose |
|--------|----------|---------------|---------|
| GET | `/api/v1/admin/overview` | Admin → System Overview | Platform KPIs |
| GET | `/api/v1/admin/analytics` | Admin → Analytics | Trends charts, district KPIs |
| GET | `/api/v1/admin/health` | Admin → System Health | Component status + resource usage |
| GET | `/api/v1/admin/users` | Admin → Manage Citizens | Citizen table (search/filter) |
| PUT | `/api/v1/admin/users/:id` | Admin → Manage Citizens | Edit citizen |
| PUT | `/api/v1/admin/users/:id/suspend` | Admin → Manage Citizens | Suspend account |
| PUT | `/api/v1/admin/users/:id/activate` | Admin → Manage Citizens | Reactivate account |
| GET | `/api/v1/admin/officers` | Admin → Manage Officers | Officer list |
| POST | `/api/v1/admin/users` | Admin → Add User/Officer | Create citizen or officer |
| DELETE | `/api/v1/admin/officers/:id` | Admin → Manage Officers | Remove officer |
| GET | `/api/v1/admin/models` | Admin → ML Model Stats | Model registry + metrics |
| POST | `/api/v1/admin/models/retrain` | Admin → ML Model Stats | Trigger retrain |
| GET | `/api/v1/admin/data-sources` | Admin → Data Overview | Data inventory |
| GET | `/api/v1/admin/activity-log` | Admin → Activity Logs | Full audit log with IP |
| GET | `/api/v1/admin/settings` | Admin → Settings | Current thresholds |
| PUT | `/api/v1/admin/settings` | Admin → Settings | Update thresholds |
| POST | `/api/v1/admin/wells/import` | Admin → (bulk ops) | CSV well data import |

### WebSocket
| Endpoint | Purpose |
|----------|---------|
| `ws:///api/v1/ws` | Real-time alerts (CRITICAL/DANGER predictions, complaint status changes) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Python ML service takes longer (model loading issues) | Dev B starts this on Day 3 (highest priority). If LSTM custom layers fail, fall back to XGBoost-only ensemble initially |
| PostGIS KNN query is slow | Dev A benchmarks on Day 3. If slow, add `ST_DWithin` radius filter before KNN. Already planned in the query |
| gRPC integration fails | Both devs test together on Day 4 merge point. Fallback: REST bridge between Go and Python (slower but works) |
| One dev is blocked waiting on the other | Most tasks are independent until merge points. If blocked, write tests for your existing code |
| Docker build issues | Dev A tackles Docker on Day 9, not Day 10. Full Day 10 is buffer for fixes |
| Complaint + Gov features too large for Days 5-7 | Core complaint CRUD is Day 5 priority. Gov request management is Day 6. Tankers + reports can be stubbed if tight |
| PDF report generation complexity | Use simple Go template + embedded HTML→PDF library (wkhtmltopdf or chromedp). CSV export is trivial. If PDF is blocky, ship CSV-only first |
| Frontend wiring on Day 10 is too tight | Dashboard JS currently uses mock data. Replace `fetch()` calls only — no UI changes needed. Each dashboard is independent |

---

## File Ownership Map

```
DEV A owns:                              DEV B owns:
──────────                               ──────────
docker-compose.yml                       internal/config/
Makefile                                 internal/middleware/ (all)
migrations/ (all 11+)                    internal/model/ (all)
scripts/seed.go                          internal/handler/auth.go
internal/repository/ (all)               internal/handler/weather.go
internal/spatial/                        internal/handler/model_status.go
internal/service/spatial.go              internal/handler/district.go
internal/service/well.go                 internal/handler/alert.go
internal/service/prediction.go           internal/handler/gov.go (request mgmt)
internal/handler/well.go                 internal/handler/gov_task.go
internal/handler/predict.go              internal/handler/gov_activity.go
internal/handler/complaint.go            internal/handler/gov_reports.go
internal/handler/admin.go (users/wells)  internal/handler/admin_ml.go
internal/handler/gov_tanker.go           internal/handler/admin_health.go
internal/cache/redis.go                  internal/handler/admin_data.go
Dockerfile (Go)                          internal/handler/admin_audit.go
nginx.conf                               internal/handler/admin_settings.go
docker-compose.prod.yml                  internal/service/auth.go
                                         internal/service/weather.go
                                         internal/service/district.go
                                         internal/service/notifier.go
                                         internal/service/complaint.go
                                         internal/grpcclient/ml_client.go
                                         internal/handler/ws.go
                                         ml-service/ (entire Python service)
                                         proto/prediction.proto
                                         .github/workflows/ci.yml
                                         pkg/response/ & pkg/validator/
                                         frontend/v2/ (JS wiring on Day 10)

SHARED (both touch):
──────────
cmd/server/main.go
internal/handler/router.go
internal/handler/health.go
README.md
```

---

## Checklist: End-of-Day Verification

| Day | Must Work |
|-----|-----------|
| 1 | `make run` → server starts, `/health` → 200, Docker containers healthy |
| 2 | `make migrate-up` → 10+ migrations succeed, `SELECT COUNT(*) FROM well_readings` = ~84K, complaints/alerts/tanker tables exist, proto compiles with multi-month forecast |
| 3 | `FindKNearest(21.15, 79.09, 5, 50)` returns 5 wells. Complaint CRUD works. `grpcurl` → Python ML responds with 3-month forecast + SHAP |
| 4 | Go gRPC client → Python → valid prediction with 3-month outlook. 3-role JWT works (citizen/gov/admin). Audit log captures writes. IDW math tests pass |
| 5 | **User dashboard fully backed:** `POST /predict` → depth+risk+3mo+SHAP. `POST /complaints` → tracking number. `GET /districts/summary` → table data. `GET /alerts` → feed |
| 6 | Full orchestrator + gov command center: predictions auto-create alerts. Gov overview KPIs, request assign/resolve/escalate, district analytics, 90-day forecast all work |
| 7 | Cache hit <5ms. WebSocket alerts work. Gov tanker CRUD + task assignment + activity log all work |
| 8 | **All 3 dashboards backed:** Admin users CRUD, officers CRUD, model registry, audit log, settings, system health. Gov reports generate PDF/CSV |
| 9 | `docker compose up` → full stack + all 5 frontend pages served. CI green. `/metrics` works. Tests >75% coverage |
| 10 | All frontend JS wired to real API. Full E2E: citizen→predicts→complains→gov assigns→resolves→admin audits. Load test passes. **Tagged v1.0.0** |

---

*Each dev delivers ~8-10 tasks/day. Merge daily. Ship on Day 10.*
