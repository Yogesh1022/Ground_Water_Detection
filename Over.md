# AquaVidarbha Project Execution Flow and Implementation Status (Over.md)

Date: 2026-03-15
Workspace reviewed: Ground_Water_Detection

## 1) What this project currently is

This repository currently contains three parallel tracks:

1. Go backend API skeleton with working auth and role guard foundation.
2. Frontend UI prototypes (especially in frontend/v2) that are visually advanced but mostly static/demo-driven.
3. Python ML research/training artifacts (notebooks + dataset) that are not yet wired into runtime backend inference.

So the project is architecturally well-planned, but implementation is still in a foundation/prototype integration stage.

---

## 2) Actual runtime execution flow today (as implemented)

## 2.1 Backend startup flow (Go)

Entry point: backend/cmd/server/main.go

Execution order:

1. Load environment config via internal/config/config.go.
2. Validate required auth config (JWT secret length and token TTL).
3. Initialize structured logger.
4. Create PostgreSQL pool and ping DB.
5. Create Redis client and ping Redis.
6. Build Gin router.
7. Apply middleware chain:
   - Request logger
   - Panic recovery
   - CORS
8. Build auth service and auth handler.
9. Register routes (health + auth + role-group routes).
10. Start HTTP server on configured APP_PORT.
11. Wait for SIGINT/SIGTERM and gracefully shutdown.

Current backend route map:

- GET /health
- POST /api/v1/auth/login
- GET /api/v1/common-user/me (JWT + role=citizen)
- GET /api/v1/admin/me (JWT + role=admin)
- GET /api/v1/govn-user/me (JWT + role=gov)

What those role endpoints return right now:
- Only identity from token claims (id/name/email/role), not database-backed dashboard data.

## 2.2 Auth/login execution flow today

When POST /api/v1/auth/login is called:

1. Request body validated (email + password).
2. Query users table by email.
3. If missing user -> invalid credentials.
4. If user inactive -> forbidden.
5. Compare bcrypt hash with provided password.
6. On success generate JWT (HS256) with claims:
   - user_id
   - role
   - name
   - email
7. Return token and user object.

Token usage on protected routes:

1. Auth middleware reads Authorization: Bearer token.
2. Validates JWT signature and method HS256.
3. Loads claims into Gin context.
4. RequireRole middleware checks exact required role.
5. Handler returns response.

## 2.3 Infrastructure execution flow (Docker)

Using backend/docker-compose.yml:

1. PostGIS PostgreSQL starts (mapped to host port 5433).
2. Redis starts (host port 6379).
3. Backend container starts after DB/Redis become healthy.
4. DB schema auto-initialized using backend/migrations/schema.sql mounted as init script.

Note:
- Local non-PostGIS alternative schema is also available at backend/migrations/schema_local.sql.

## 2.4 Frontend execution flow today

Frontend is split into two styles:

1. frontend/v2/*.html: rich static pages with inline JS/CSS.
2. frontend/js/app.js + frontend/css/style.css: separate UI script/style for another dashboard variant.

Current behavior in v2:

- login.html uses hardcoded demo credentials in browser JS.
- On success, role is stored in sessionStorage.
- User is redirected to dashboard-gov.html or dashboard-admin.html.
- Dashboard pages gate access by reading sessionStorage role.
- Charts/tables/cards are pre-seeded static data.
- No backend API integration calls are currently wired.

So the frontend currently executes as a standalone prototype flow independent from Go auth APIs.

## 2.5 ML execution flow today

ML is currently notebook-centric:

- notebooks/01_Data_Analysis.ipynb
- notebooks/02_Model_Training.ipynb
- notebooks/03_XGBoost_Deep_Dive.ipynb
- notebooks/04_LSTM_Deep_Dive.ipynb
- notebooks/05_RandomForest_No_Lag.ipynb

These support data analysis/training experiments using requirements.txt dependencies.

Current state in runtime app:
- No active Go-to-ML inference bridge is implemented in code yet.
- Prediction APIs mentioned in planning docs are not implemented in backend routes currently.

---

## 3) Folder-by-folder implementation status

## 3.1 Root

Implemented:
- README with setup instructions and declared architecture.
- Python package metadata (pyproject.toml).
- requirements.txt for DS/ML notebook stack.
- main.py is only a placeholder hello script.

Remaining:
- Root Python app runtime is not implemented (main.py is not project runtime).

## 3.2 backend

Implemented:
- Config loader and validation.
- Logger, CORS, recovery, JWT auth middleware.
- Login service + handler.
- Route registration with role-guarded starter endpoints.
- Dockerfile + docker-compose + Makefile.
- Comprehensive SQL schema files.

Partially implemented:
- Dashboard modules exist as folder scaffolds with minimal handler stubs.

Not implemented (in code) though heavily planned in MD docs:
- Citizen dashboard APIs (home summary, prediction, complaint lifecycle, alerts, map endpoints).
- Gov dashboard APIs (queue, assignment, status transitions, tanker routes, analytics, reports).
- Admin dashboard APIs (overview, users/officers CRUD, settings, model registry, audit feeds, health panels).
- Repository and service layers for dashboard modules.
- ML model integration client/service.
- Real-time features (websocket notifications).
- Broad test suite and endpoint integration tests.

## 3.3 frontend

Implemented:
- Visually complete landing and dashboard prototypes.
- Role-based screen separation in browser session (demo-only).
- Extensive chart/map UI mockups.

Not implemented:
- Real JWT login integration with backend /api/v1/auth/login.
- Real API wiring for dashboard cards/tables/charts.
- Error/loading state behavior based on live backend responses.
- Unified state/data layer.

## 3.4 data

Implemented:
- Main dataset present (vidarbha_groundwater_extended_v2.csv).
- Plots directory exists for analysis outputs.

Remaining:
- No visible automated data ingestion pipeline code integrated into backend runtime.

## 3.5 notebooks

Implemented:
- EDA and model training notebooks sequence exists.

Remaining:
- Productionized ML serving path (API/grpc/service) and model registry wiring into backend.

## 3.6 MD (planning and design docs)

Implemented:
- Extensive architecture/design/roadmap documentation.
- Very detailed endpoint and module plans.

Current gap:
- Documentation depth is much ahead of executable code depth.

---

## 4) What is concretely implemented right now

If you run only the backend today, practical live features are:

1. Health check endpoint.
2. JWT login against users table.
3. Role-protected /me endpoints for citizen/gov/admin.
4. Startup resilience with DB/Redis ping checks and graceful shutdown.

If you open frontend/v2 pages today, practical live features are:

1. Demo login with hardcoded browser credentials.
2. Role-based navigation using sessionStorage.
3. Static dashboards with seeded values/charts.

There is no full end-to-end flow yet where frontend login -> backend JWT -> live dashboard APIs -> ML predictions.

---

## 5) What remains to be implemented (priority order)

## Priority A: Integrate frontend auth with backend auth

1. Replace login.html demo credential checks with POST /api/v1/auth/login.
2. Store JWT token and user role from backend response.
3. Apply Authorization header for protected API calls.
4. Replace sessionStorage role-only gate with token-based auth flow.

## Priority B: Build minimum dashboard APIs (real data)

1. Citizen:
   - complaints create/list/detail
   - alerts list
   - home summary
2. Gov:
   - complaints queue + assign/status/escalate
   - overview KPIs
   - tanker list/create/update
3. Admin:
   - users/officers list/create/update/activate
   - overview + health + activity log

## Priority C: Wire prediction service path

1. Define prediction service interface in Go.
2. Add initial mock adapter to unblock frontend integration.
3. Add real ML adapter (HTTP/gRPC/Python service).
4. Persist prediction outputs to predictions table.

## Priority D: Testing and hardening

1. Unit tests for service layer and auth flows.
2. Integration tests for major endpoints.
3. Smoke test script for dashboard critical routes.
4. Caching strategy where needed (Redis for expensive summaries).

---

## 6) Current architecture reality vs planned architecture

Planned architecture in docs:
- Full 3-role production system with comprehensive modules and ML-backed predictions.

Actual architecture in code today:
- Production-ready backend skeleton + auth foundation,
- Full DB schema,
- Prototype frontend,
- ML research notebooks,
- But missing middle layers that connect everything.

Short verdict:
- Foundation is good.
- UI is mostly ready as prototype.
- Integration and domain APIs are the main unfinished implementation block.

---

## 7) High-confidence next implementation checkpoint (recommended)

A realistic first complete vertical slice should be:

1. Backend:
   - implement common-user complaints create/list/detail.
2. Frontend:
   - integrate real login + JWT storage.
   - connect user complaint form + track table to real APIs.
3. Validation:
   - verify one real citizen journey end-to-end.

Once this works, repeat the same vertical-slice approach for gov complaint actions, then admin management.

---

## 8) Final implementation summary

Current project status by execution maturity:

- Backend core infra/auth: Implemented.
- Dashboard business APIs: Mostly not implemented.
- Frontend UI: Implemented as prototype.
- Frontend-backend integration: Not implemented.
- ML in production serving path: Not implemented.
- Documentation/planning: Highly implemented.

This means your project is in a transition stage from prototype + architecture design into full product integration.
