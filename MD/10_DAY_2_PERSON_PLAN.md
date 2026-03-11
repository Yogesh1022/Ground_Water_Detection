# AquaVidarbha — 10-Day, 2-Person Implementation Plan

> **Team:**
> - **Dev A (Backend & Infra Lead)** — Go server, DB, Docker, deployment
> - **Dev B (ML Integration & API Lead)** — Python ML service, gRPC, handlers, caching
>
> **Rule:** Both devs work in parallel on independent tracks. Sync at defined merge points (🔀) each day. All code merged to `main` via PRs with review from the other dev.

---

## Workstream Overview

```
DAY   1     2     3     4     5     6     7     8     9     10
      ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃
A ━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫
      │Setup│ DB  │Repos│Spatl│Wells│Pred │Cache│ WS  │Docke│Prod
      │Infra│Migrn│Layer│KNN  │Hndlr│Orch │Redis│Alert│rize │Fix
      ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃     ┃
B ━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫━━━━━┫
      │Setup│Proto│Pyth │gRPC │Auth │Weath│Dist │Admn │CI/CD│Prod
      │Conf │buf  │ML   │Clnt │JWT  │Hndl │Hndl │Hndlr│Test │Fix
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
| 1 | Write config loader (env-based struct) | `internal/config/config.go` | ☐ |
| 2 | Write Zap logger setup (JSON, request fields) | `internal/middleware/logger.go` | ☐ |
| 3 | Write recovery middleware | `internal/middleware/recovery.go` | ☐ |
| 4 | Write CORS middleware | `internal/middleware/cors.go` | ☐ |
| 5 | Write `main.go` skeleton: load config → init logger → connect DB pool → connect Redis → setup Gin → graceful shutdown | `cmd/server/main.go` | ☐ |
| 6 | Write health check handler (`/health`, `/ready`) | `internal/handler/health.go` | ☐ |
| 7 | Write standard JSON response builder | `pkg/response/response.go` | ☐ |

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
| 3 | Migration 003: `predictions` history table with JSONB `nearest_wells` | `migrations/003_create_predictions.up.sql` | ☐ |
| 4 | Migration 004: `users` table (email, password_hash, role) | `migrations/004_create_users.up.sql` | ☐ |
| 5 | Write all `*.down.sql` rollback files | `migrations/00*_*.down.sql` | ☐ |
| 6 | Run `make migrate-up` — verify all tables exist | — | ☐ |
| 7 | Write seed script: parse CSV → bulk insert wells + readings via `pgx.CopyFrom` | `scripts/seed_wells.go` | ☐ |
| 8 | Run seed: all ~84K rows + 650 wells imported | — | ☐ |

### Dev B: Protobuf Definition & Code Generation

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write `prediction.proto` (PredictionRequest 26 fields, PredictionResponse, ModelStatus) | `proto/prediction.proto` | ☐ |
| 2 | Write `generate_proto.sh` for both Go + Python codegen | `scripts/generate_proto.sh` | ☐ |
| 3 | Generate Go proto stubs, verify compilation | `proto/ml/*.pb.go` | ☐ |
| 4 | Generate Python proto stubs | `ml-service/proto/*_pb2.py` | ☐ |
| 5 | Write all domain models: `Well`, `WellReading`, `PredictRequest`, `PredictResponse`, `User`, `District`, `Weather` | `internal/model/*.go` | ☐ |
| 6 | Write input validator (Vidarbha bounding box: 19.5–22.0°N, 75.5–81.0°E) | `pkg/validator/validator.go` | ☐ |

### 🔀 Day 2 Merge Point
- **Verify:** `make migrate-up` succeeds, `SELECT COUNT(*) FROM well_readings` = ~84K, proto compiles on both sides
- **Shared contract:** Both devs now agree on proto + domain model structs

---

## Day 3 — Repository Layer & Python ML Service

### Dev A: Repository Implementations (PostgreSQL)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Well repo: `GetAll`, `GetByID`, `GetByDistrict` | `internal/repository/well_repo.go` | ☐ |
| 2 | Well repo: `FindKNearest` (PostGIS `<->` KNN operator, ST_DWithin) | `internal/repository/well_repo.go` | ☐ |
| 3 | Well repo: `GetLatestReading`, `GetReadings` | `internal/repository/well_repo.go` | ☐ |
| 4 | Prediction repo: `Store`, `GetByUser`, `GetStats` | `internal/repository/prediction_repo.go` | ☐ |
| 5 | User repo: `Create`, `GetByEmail`, `GetAll` | `internal/repository/user_repo.go` | ☐ |
| 6 | District repo: `GetAll`, `GetByName` (with aggregates) | `internal/repository/district_repo.go` | ☐ |
| 7 | Write materialized view `district_stats` + refresh function | `migrations/005_district_stats.up.sql` | ☐ |
| 8 | Unit tests for all repos (use testcontainers or test DB) | `internal/repository/*_test.go` | ☐ |

### Dev B: Python ML Microservice (Complete)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Setup `ml-service/` project: `requirements.txt`, Dockerfile structure | `ml-service/requirements.txt` | ☐ |
| 2 | Write model registry: load XGBoost, LSTM (with custom AttnSoftmax/AttnContext), Random Forest at startup | `ml-service/app/model_registry.py` | ☐ |
| 3 | Write feature pipeline: proto fields → ordered numpy array (25 features), MinMaxScaler for DL models | `ml-service/app/feature_pipeline.py` | ☐ |
| 4 | Write ensemble logic: XGB(0.30)+LSTM(0.25)+CNN-LSTM(0.20)+GRU(0.15)+1D-CNN(0.10) | `ml-service/app/service.py` | ☐ |
| 5 | Write SHAP explainer: top-10 feature importance per prediction | `ml-service/app/explainer.py` | ☐ |
| 6 | Write risk classifier: SAFE/WARNING/CRITICAL/EXTREME from depth_mbgl | `ml-service/app/config.py` | ☐ |
| 7 | Write gRPC server: `Predict()` and `ModelStatus()` RPCs | `ml-service/app/server.py` | ☐ |
| 8 | Test with `grpcurl`: send sample request, get valid prediction response | — | ☐ |

### 🔀 Day 3 Merge Point
- **Verify:** `FindKNearest(21.15, 79.09, 5, 50)` returns 5 wells sorted by distance. Python gRPC server responds to `grpcurl`
- **Key contract:** Repo interfaces frozen — services build on top from Day 4

---

## Day 4 — Spatial Service & gRPC Client

### Dev A: Spatial Service (KNN + IDW — the brain)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write KNN service: call `well_repo.FindKNearest`, fetch latest readings for each | `internal/service/spatial.go` | ☐ |
| 2 | Write IDW interpolation: `weight_i = 1/dist_i²`, weighted average of depth_lag_1q, depth_lag_2q, etc. | `internal/spatial/idw.go` | ☐ |
| 3 | Implement 3-path routing logic: EXACT_WELL (<1km) / IDW_INTERPOLATED (3+ wells) / ENVIRONMENTAL_ONLY (<3 wells) | `internal/service/spatial.go` | ☐ |
| 4 | Write well service: `ListAll`, `GetByID`, `GetReadings` (business logic wrapper over repo) | `internal/service/well.go` | ☐ |
| 5 | Unit tests: IDW math (weights sum to 1, closer=higher weight), path routing edge cases | `internal/spatial/idw_test.go`, `internal/service/spatial_test.go` | ☐ |

### Dev B: Go gRPC Client + Auth Service

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write gRPC client: connect with keepalive, 5s timeout, `Predict()`, `ModelStatus()` | `internal/grpcclient/ml_client.go` | ☐ |
| 2 | Test Go gRPC client → Python ML service end-to-end (hardcoded features → valid response) | `internal/grpcclient/ml_client_test.go` | ☐ |
| 3 | Write auth service: `Register` (bcrypt hash, cost 12), `Login` (verify + issue JWT HS256) | `internal/service/auth.go` | ☐ |
| 4 | Write JWT middleware: extract Bearer token, validate, inject user_id+role into `gin.Context` | `internal/middleware/auth.go` | ☐ |
| 5 | Write role middleware: `RequireRole("admin")` | `internal/middleware/auth.go` | ☐ |
| 6 | Write rate limiter middleware (token bucket per IP, Redis-backed) | `internal/middleware/ratelimit.go` | ☐ |
| 7 | Unit tests: JWT expiry, invalid signature, role check, rate limit (101st req = 429) | `internal/middleware/*_test.go` | ☐ |

### 🔀 Day 4 Merge Point
- **Verify:** Go gRPC client calls Python ML service successfully. Spatial IDW returns interpolated depths. JWT flow works register→login→protected endpoint
- **Critical integration:** gRPC connection is the bridge between Go and Python — both devs test this together

---

## Day 5 — HTTP Handlers (Wells, Auth, Predict)

### Dev A: Well Handlers + Predict Handler

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `GET /api/v1/wells` — paginated list (page, per_page query params) | `internal/handler/well.go` | ☐ |
| 2 | `GET /api/v1/wells/:id` — single well with latest reading | `internal/handler/well.go` | ☐ |
| 3 | `GET /api/v1/wells/:id/readings` — well reading history (limit param) | `internal/handler/well.go` | ☐ |
| 4 | `POST /api/v1/predict` — validate input → call prediction orchestrator → return response | `internal/handler/predict.go` | ☐ |
| 5 | `GET /api/v1/predict/history` — user's past predictions (paginated) | `internal/handler/predict.go` | ☐ |
| 6 | Write router setup: group routes, apply middleware per group | `internal/handler/router.go` | ☐ |

### Dev B: Auth Handler + Weather Service + Model Status

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `POST /api/v1/auth/register` — validate, create user, return JWT | `internal/handler/auth.go` | ☐ |
| 2 | `POST /api/v1/auth/login` — verify creds, return JWT | `internal/handler/auth.go` | ☐ |
| 3 | Write weather service: fetch Open-Meteo API, compute rolling/deficit features | `internal/service/weather.go` | ☐ |
| 4 | `GET /api/v1/weather/:lat/:lon` — return live weather + derived features | `internal/handler/weather.go` | ☐ |
| 5 | `GET /api/v1/models/status` — call gRPC `ModelStatus()`, format response | `internal/handler/model_status.go` | ☐ |
| 6 | Write request ID middleware (UUID per request for tracing) | `internal/middleware/requestid.go` | ☐ |

### 🔀 Day 5 Merge Point
- **Verify with curl:**
  - `POST /api/v1/auth/register` → JWT
  - `GET /api/v1/wells` (with JWT) → paginated well list
  - `POST /api/v1/predict` (with JWT) → full prediction response from ML service
  - `GET /api/v1/models/status` → model readiness info
- **Milestone:** End-to-end prediction pipeline works (GPS → Go → Python → Response)

---

## Day 6 — Prediction Orchestrator & Weather Integration

### Dev A: Prediction Orchestrator Service (ties everything together)

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write `PredictionService.Predict()`: spatial→weather→buildGRPCReq→callML→buildResponse | `internal/service/prediction.go` | ☐ |
| 2 | Build 25-feature gRPC request from spatial interpolation + weather data + request params | `internal/service/prediction.go` | ☐ |
| 3 | Generate recommendation text from risk_level + month (e.g. "Pre-position tankers for April") | `internal/service/prediction.go` | ☐ |
| 4 | Store prediction to DB asynchronously (`go s.predRepo.Store(...)`) | `internal/service/prediction.go` | ☐ |
| 5 | Integration test: real DB + real Python ML = valid prediction | `internal/service/prediction_test.go` | ☐ |

### Dev B: District Handler + Weather Cache

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write district service: aggregate from materialized view, compute risk distribution | `internal/service/district.go` | ☐ |
| 2 | `GET /api/v1/districts` — list all 11 districts with stats | `internal/handler/district.go` | ☐ |
| 3 | `GET /api/v1/districts/:name` — detail with well count, avg depth, trend | `internal/handler/district.go` | ☐ |
| 4 | Add Redis caching to weather service (6hr TTL for live, 30d for historical) | `internal/service/weather.go` | ☐ |
| 5 | Write timeout middleware (30s context deadline on all requests) | `internal/middleware/timeout.go` | ☐ |

### 🔀 Day 6 Merge Point
- **Verify:** Full prediction orchestrator: `POST /predict {lat, lon, month, year}` → spatial lookup → weather fetch → gRPC call → complete JSON response with risk_level, confidence, nearest_wells, recommendation
- **Milestone:** Core product feature is DONE

---

## Day 7 — Redis Caching & WebSocket Alerts

### Dev A: Redis Caching Layer

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write Redis cache wrapper: `Get`, `Set`, `Delete` with JSON marshal/unmarshal | `internal/cache/redis.go` | ☐ |
| 2 | Cache predictions: key=`pred:{lat}:{lon}:{month}:{year}`, TTL=1hr | `internal/service/prediction.go` | ☐ |
| 3 | Cache district stats: key=`district:{name}:stats`, TTL=15min | `internal/service/district.go` | ☐ |
| 4 | Cache well list: key=`wells:all`, TTL=5min | `internal/service/well.go` | ☐ |
| 5 | Cache model status: key=`model:status`, TTL=30s | `internal/handler/model_status.go` | ☐ |
| 6 | Benchmark: verify cache-hit prediction < 5ms, cache-miss < 400ms | — | ☐ |

### Dev B: WebSocket Real-Time Alerts

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write WebSocket hub: manage connections, subscribe to topics (all / district) | `internal/handler/ws.go` | ☐ |
| 2 | Write notifier service: broadcast alert to subscribers when CRITICAL/EXTREME prediction | `internal/service/notifier.go` | ☐ |
| 3 | Integrate notifier into prediction orchestrator (after risk_level classified) | `internal/service/prediction.go` | ☐ |
| 4 | Write alert message format: `{"type":"alert","risk":"CRITICAL","district":"Nagpur",...}` | `internal/model/alert.go` | ☐ |
| 5 | Test with `wscat`: connect, subscribe, trigger prediction, receive alert | — | ☐ |

### 🔀 Day 7 Merge Point
- **Verify:** Second identical predict request returns cached result in <5ms. WebSocket client receives alert on CRITICAL prediction
- **All features done.** Remaining days = hardening

---

## Day 8 — Admin Endpoints & Testing Sprint

### Dev A: Admin Handlers + Integration Tests

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | `POST /api/v1/admin/wells` — add new well (admin-only) | `internal/handler/admin.go` | ☐ |
| 2 | `PUT /api/v1/admin/wells/:id` — update well metadata | `internal/handler/admin.go` | ☐ |
| 3 | `POST /api/v1/admin/wells/import` — bulk CSV upload (multipart form) | `internal/handler/admin.go` | ☐ |
| 4 | `GET /api/v1/admin/predictions/stats` — total predictions, avg latency, risk distribution | `internal/handler/admin.go` | ☐ |
| 5 | `GET /api/v1/admin/users` — list all users | `internal/handler/admin.go` | ☐ |
| 6 | Write integration tests for entire predict pipeline (DB + Redis + gRPC) | `tests/integration/predict_test.go` | ☐ |

### Dev B: Unit Tests + Python ML Tests

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Unit tests: all handlers (mock services, test HTTP status codes, response format) | `internal/handler/*_test.go` | ☐ |
| 2 | Unit tests: all services (mock repos, test business logic) | `internal/service/*_test.go` | ☐ |
| 3 | Unit tests: Vidarbha boundary validator, IDW edge cases, risk classification | `pkg/validator/*_test.go` | ☐ |
| 4 | Python: test feature pipeline (correct ordering, correct scaling) | `ml-service/tests/test_feature_pipeline.py` | ☐ |
| 5 | Python: test ensemble math (weights sum to 1, correct weighted average) | `ml-service/tests/test_predictions.py` | ☐ |
| 6 | Run `go test ./... -cover` — target >75% coverage | — | ☐ |

### 🔀 Day 8 Merge Point
- **Verify:** `make test` passes. All admin endpoints work with admin JWT. Python tests pass. Coverage >75%

---

## Day 9 — Dockerization & CI/CD

### Dev A: Docker Build & Production Compose

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write Go multi-stage Dockerfile (builder → alpine, ~15MB binary) | `Dockerfile` | ☐ |
| 2 | Write Python ML Dockerfile (python:3.11-slim, copy models) | `ml-service/Dockerfile` | ☐ |
| 3 | Write production `docker-compose.yml` (gateway, ml-service, postgres, redis, nginx) | `docker-compose.prod.yml` | ☐ |
| 4 | Write NGINX config: reverse proxy `/api/*` → Go, serve frontend static, WebSocket upgrade | `nginx.conf` | ☐ |
| 5 | Test `docker compose -f docker-compose.prod.yml up` — full stack boots, `/health` works | — | ☐ |
| 6 | Add healthchecks for all services in compose | `docker-compose.prod.yml` | ☐ |

### Dev B: CI/CD Pipeline + Observability

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write GitHub Actions CI: lint → test → build (with postgres+redis services) | `.github/workflows/ci.yml` | ☐ |
| 2 | Add Prometheus metrics endpoint (`/metrics`): request count, latency histogram, cache hits | `internal/middleware/metrics.go` | ☐ |
| 3 | Add key metrics: `prediction_latency_seconds`, `grpc_call_duration`, `cache_hit_ratio` | `internal/middleware/metrics.go` | ☐ |
| 4 | Write request ID propagation (request_id in all logs + response headers) | `internal/middleware/requestid.go` | ☐ |
| 5 | Verify `docker build` for both Go and Python images succeeds | — | ☐ |
| 6 | Push to GitHub, verify CI passes green | — | ☐ |

### 🔀 Day 9 Merge Point
- **Verify:** `docker compose up` → entire stack runs. CI pipeline passes. `/metrics` returns Prometheus data

---

## Day 10 — Polish, Load Test & Ship

### Dev A: Performance & Production Hardening

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Run load test: 100 concurrent prediction requests — all return <500ms | — | ☐ |
| 2 | Tune PostgreSQL connection pool (max_conns based on load test) | `internal/config/config.go` | ☐ |
| 3 | Add db connection pool metrics to health/ready endpoint | `internal/handler/health.go` | ☐ |
| 4 | Verify graceful shutdown: send SIGTERM during load → all in-flight complete | — | ☐ |
| 5 | Security audit: no hardcoded secrets, all env-based, bcrypt cost=12, JWT secret ≥32 chars | — | ☐ |
| 6 | Write `.env.production` template with all required vars documented | `.env.production.example` | ☐ |

### Dev B: Documentation & Final Integration Test

| # | Task | Files | Done |
|---|------|-------|------|
| 1 | Write API README: endpoints, auth flow, example curl commands for every endpoint | `README.md` | ☐ |
| 2 | Write Python ML service README: setup, model loading, proto regen | `ml-service/README.md` | ☐ |
| 3 | Full E2E smoke test: register→login→predict→check history→check WebSocket alert | — | ☐ |
| 4 | Verify frontend dashboard connects to new Go backend (CORS, all endpoints) | — | ☐ |
| 5 | Fix any remaining test failures, lint warnings | — | ☐ |
| 6 | Tag `v1.0.0` release | — | ☐ |

### 🔀 Day 10 Merge Point — SHIP 🚀
- **Verify:** Full stack running in Docker. Load test passes. CI green. Frontend connected. Docs complete.

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
PredictionRequest  → 26 fields (features + path hint)
PredictionResponse → depth, risk, confidence, per-model results, SHAP, explanation
ModelStatusResponse → per-model readiness
```

### 2. Domain Model Structs (`internal/model/`)
```go
PredictRequest  {Latitude, Longitude, Month, Year}
PredictResponse {DepthMBGL, DepthFeet, RiskLevel, Confidence, ModelSource, Explanation, Recommendation, NearestWells, LatencyMs}
Well            {WellID, District, Latitude, Longitude, ElevationM, SlopeDegree}
User            {ID, Email, PasswordHash, Name, Role}
```

### 3. Repository Interfaces
```go
WellRepository      → GetAll, GetByID, GetByDistrict, FindKNearest, GetLatestReading, GetReadings
PredictionRepository → Store, GetByUser, GetStats
UserRepository      → Create, GetByEmail, GetAll
DistrictRepository  → GetAll, GetByName
```

### 4. Service Interfaces
```go
SpatialService     → FindNeighbors(lat, lon) → ([]NearestWell, path)
                     InterpolateFeatures(neighbors) → InterpolatedFeatures
WeatherService     → GetFeatures(lat, lon, month, year) → WeatherFeatures
PredictionService  → Predict(ctx, PredictRequest) → PredictResponse
AuthService        → Register(email, pass, name) → JWT
                     Login(email, pass) → JWT
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Python ML service takes longer (model loading issues) | Dev B starts this on Day 3 (highest priority). If LSTM custom layers fail, fall back to XGBoost-only ensemble initially |
| PostGIS KNN query is slow | Dev A benchmarks on Day 3. If slow, add `ST_DWithin` radius filter before KNN. Already planned in the query |
| gRPC integration fails | Both devs test together on Day 4 merge point. Fallback: REST bridge between Go and Python (slower but works) |
| One dev is blocked waiting on the other | Most tasks are independent until merge points. If blocked, write tests for your existing code |
| Docker build issues | Dev A tackles Docker on Day 9, not Day 10. Full Day 10 is buffer for fixes |

---

## File Ownership Map

```
DEV A owns:                              DEV B owns:
──────────                               ──────────
docker-compose.yml                       internal/config/
Makefile                                 internal/middleware/ (all)
migrations/                              internal/model/ (all)
scripts/seed_wells.go                    internal/handler/auth.go
internal/repository/ (all)               internal/handler/weather.go
internal/spatial/                        internal/handler/model_status.go
internal/service/spatial.go              internal/handler/district.go
internal/service/well.go                 internal/service/auth.go
internal/service/prediction.go           internal/service/weather.go
internal/handler/well.go                 internal/service/district.go
internal/handler/predict.go              internal/service/notifier.go
internal/handler/admin.go                internal/grpcclient/ml_client.go
internal/cache/redis.go                  internal/handler/ws.go
Dockerfile (Go)                          ml-service/ (entire Python service)
nginx.conf                               proto/prediction.proto
docker-compose.prod.yml                  .github/workflows/ci.yml
                                         pkg/response/ & pkg/validator/

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
| 2 | `make migrate-up` → tables exist, `SELECT COUNT(*) FROM well_readings` = ~84K, proto compiles |
| 3 | `FindKNearest(21.15, 79.09, 5, 50)` returns 5 wells. `grpcurl` → Python ML responds |
| 4 | Go gRPC client → Python → valid prediction. JWT register/login works. IDW math tests pass |
| 5 | **E2E:** `POST /predict` with JWT → complete prediction response from ML service |
| 6 | Full orchestrator: GPS → spatial → weather → gRPC → cached response with recommendation |
| 7 | Cache hit <5ms. WebSocket client receives CRITICAL alert after predict |
| 8 | All admin endpoints work. `make test` >75% coverage. Python tests pass |
| 9 | `docker compose up` → full stack. CI pipeline green. `/metrics` works |
| 10 | Load test passes. Frontend connected. Docs complete. **Tagged v1.0.0** |

---

*Each dev delivers ~8 tasks/day. Merge daily. Ship on Day 10.*
