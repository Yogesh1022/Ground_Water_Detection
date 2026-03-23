# Over2: Backend File Roles, Connections, and Execution Flow (Detailed)

Date: 2026-03-15
Project: AquaVidarbha
Focus: backend folder only

## A) Why this document exists

This document explains, in a step-wise and structured way:

1. Role of each backend file and folder.
2. How files connect to each other.
3. Exact runtime flow from server start to API response.
4. Current implementation maturity and missing pieces.

---

## B) Backend folder map (functional view)

backend/

1. Boot and wiring
   - cmd/server/main.go

2. Configuration
   - internal/config/config.go

3. Transport (HTTP) and route wiring
   - internal/handler/router.go
   - internal/handler/auth.go

4. Cross-cutting middleware
   - internal/middleware/auth.go
   - internal/middleware/logger.go
   - internal/middleware/recovery.go
   - internal/middleware/cors.go

5. Business/service layer
   - internal/service/auth.go

6. Dashboard module boundaries (scaffolds)
   - internal/dashboard/admin/... 
   - internal/dashboard/common_user/... 
   - internal/dashboard/govn_user/... 

7. Database definition
   - migrations/schema.sql
   - migrations/schema_local.sql

8. Runtime and tooling
   - docker-compose.yml
   - Dockerfile
   - Makefile
   - go.mod
   - go.sum
   - .env.example

---

## C) File-by-file role and responsibility

## C1) cmd/server/main.go

Purpose:
- Main entry point and lifecycle orchestrator.

Primary responsibilities:
1. Load validated config from config.Load().
2. Initialize zap logger.
3. Create Postgres pool and verify connectivity.
4. Create Redis client and verify connectivity.
5. Create Gin engine.
6. Register middlewares.
7. Build auth service and auth handler.
8. Register all routes through RegisterRoutes().
9. Start HTTP server.
10. Handle graceful shutdown with SIGINT/SIGTERM.

Connection edges:
- Depends on config, middleware, service, handler packages.
- Owns the dependency injection of dbPool, jwt secret, and handler objects.

## C2) internal/config/config.go

Purpose:
- Centralized environment loader and validator.

Responsibilities:
1. Load .env/.env.local/.env.example values with fallback defaults.
2. Parse primitive env vars (int, bool, CSV).
3. Validate critical runtime requirements:
   - APP_PORT not empty
   - JWT secret length >= 32
   - JWT TTL positive
4. Produce typed config object used everywhere.
5. Build database DSN string for pgx.

Connection edges:
- Called only at startup from main.go.
- Supplies values to Postgres, Redis, CORS, JWT, and server port setup.

## C3) internal/handler/router.go

Purpose:
- Central route table and route-group composition.

Responsibilities:
1. Register public route:
   - GET /health
2. Register login route:
   - POST /api/v1/auth/login
3. Build protected route groups:
   - /api/v1/common-user (role citizen)
   - /api/v1/govn-user (role gov)
   - /api/v1/admin (role admin)
4. Attach role module route registrations.

Connection edges:
- Uses middleware.Auth and middleware.RequireRole.
- Delegates into module handlers for each role.

## C4) internal/handler/auth.go

Purpose:
- HTTP adapter for authentication use-case.

Responsibilities:
1. Validate login request JSON schema.
2. Call service.AuthService.Login().
3. Map domain errors to HTTP codes:
   - invalid credentials -> 401
   - inactive account -> 403
   - unknown issue -> 500
4. Return token + user payload.

Connection edges:
- Depends on internal/service/auth.go.
- Invoked via router.go.

## C5) internal/service/auth.go

Purpose:
- Core authentication business logic.

Responsibilities:
1. Query users table by email.
2. Verify account active status.
3. Verify bcrypt password hash.
4. Build JWT claims with user metadata.
5. Sign token using HS256 and configured secret.
6. Return normalized login result model.

Connection edges:
- Uses Postgres pool for user lookup.
- Used only by auth handler currently.

## C6) internal/middleware/auth.go

Purpose:
- Request authentication and role authorization.

Responsibilities:
1. Parse Bearer token from Authorization header.
2. Validate JWT method and signature.
3. Populate Gin context keys:
   - user_id
   - role
   - name
   - email
4. Enforce required role or any-role checks.

Connection edges:
- Applied at route-group level in router.go.
- Read by dashboard /me handlers to return identity.

## C7) internal/middleware/logger.go

Purpose:
- Structured logging foundation.

Responsibilities:
1. Build environment-aware logger configuration.
2. Log request-level observability fields.

Connection edges:
- Installed globally in main.go.
- Runs before handlers for every request.

## C8) internal/middleware/recovery.go

Purpose:
- Panic safety boundary.

Responsibilities:
1. Recover panics in request pipeline.
2. Log panic details internally.
3. Return safe generic 500 JSON to client.

Connection edges:
- Installed globally in main.go.

## C9) internal/middleware/cors.go

Purpose:
- Browser cross-origin policy enforcement.

Responsibilities:
1. Apply configured allow-origins/methods/headers.
2. Optional credentials support.
3. Handle OPTIONS preflight with 204.

Connection edges:
- Installed globally in main.go.
- Configuration comes from config.go.

## C10) Dashboard route files (current status)

Files:
1. internal/dashboard/admin/handler/routes.go
2. internal/dashboard/common_user/handler/routes.go
3. internal/dashboard/govn_user/handler/routes.go

Current responsibilities:
- Register only /me endpoint per role group.
- Return user identity from JWT context.

Important note:
- dto/repository/service folders under each role module are currently scaffolds, not implemented business logic.

## C11) migrations/schema.sql

Purpose:
- Primary complete schema for PostGIS-enabled deployment.

Responsibilities:
1. Create enums and all domain tables.
2. Create indexes, triggers, utility functions.
3. Define full data model for users, wells, readings, predictions, complaints, alerts, tasks, tanker routes, audit logs, settings, ML registry, etc.

Connection edges:
- Mounted by docker-compose into Postgres init directory.
- Auth service immediately depends on users table existing here.

## C12) migrations/schema_local.sql

Purpose:
- Local variant without PostGIS requirements.

Responsibilities:
- Provide same domain model minus spatial-extension specifics.

Connection edges:
- Useful when local DB lacks PostGIS.

## C13) docker-compose.yml

Purpose:
- Local environment orchestration.

Responsibilities:
1. Start backend container.
2. Start Postgres with schema bootstrap.
3. Start Redis.
4. Configure health checks and startup ordering.

Connection edges:
- Backend service depends on healthy Postgres + Redis.
- Uses .env values.

## C14) Dockerfile

Purpose:
- Build backend image for container execution.

Responsibilities:
- Compile and package Go backend for runtime in compose.

## C15) Makefile

Purpose:
- Command shortcuts for dev and Docker operations.

Responsibilities:
- Local run/build/tidy/air.
- Docker up/down/reset/logs/ps.

## C16) .env.example

Purpose:
- Template contract for runtime config variables.

Responsibilities:
- Document all required env values used by config.go.

Security reminder:
- It should contain placeholders, not real credentials.

## C17) go.mod and go.sum

Purpose:
- Go module identity and dependency lock integrity.

Responsibilities:
1. Define import/module path.
2. Pin dependency versions and checksums.

---

## D) End-to-end startup flow (step-wise)

1. Process starts at cmd/server/main.go.
2. config.Load() reads and validates env.
3. Logger is initialized.
4. Postgres pool is created and pinged.
5. Redis client is created and pinged.
6. Gin engine is created.
7. Middleware stack is attached (logger -> recovery -> CORS).
8. Auth service object is created with db + jwt config.
9. Auth handler is created with auth service dependency.
10. Router registration function wires all endpoints and protected groups.
11. HTTP server starts listening.
12. On shutdown signal, graceful stop is executed.

---

## E) Request flow (step-wise)

## E1) Login request path

Route: POST /api/v1/auth/login

1. Request enters Gin.
2. Logger middleware records start and later status/latency.
3. Recovery middleware guards panic boundary.
4. CORS middleware applies policy.
5. Router dispatches to auth handler.
6. auth handler validates request body.
7. auth service reads user from DB.
8. auth service verifies account + password.
9. auth service signs JWT and returns token.
10. Handler maps result to JSON response.

## E2) Protected role request path

Route example: GET /api/v1/admin/me

1. Request enters middleware chain.
2. Group-level Auth middleware validates JWT.
3. Auth middleware writes user claims into context.
4. RequireRole(admin) validates role claim.
5. admin routes.go reads context values and responds.

---

## F) Connection matrix (who calls whom)

1. main.go -> config.Load
2. main.go -> middleware.NewLogger
3. main.go -> newPostgresPool
4. main.go -> newRedisClient
5. main.go -> service.NewAuthService
6. main.go -> handler.NewAuthHandler
7. main.go -> handler.RegisterRoutes
8. router.go -> middleware.Auth
9. router.go -> middleware.RequireRole
10. router.go -> authHandler.Login
11. router.go -> admin/common_user/govn_user RegisterRoutes
12. auth handler -> auth service Login
13. auth service -> Postgres users table
14. dashboard /me handlers -> middleware context keys

---

## G) Current implementation state by layer

1. Infra setup layer: implemented.
2. Config layer: implemented.
3. Middleware layer: implemented.
4. Auth service and endpoint: implemented.
5. Role routing skeleton: implemented.
6. Role-specific domain logic: mostly missing.
7. Data schema: fully defined.
8. Automated tests: minimal to none (no test files yet).

---

## H) Immediate practical understanding checklist

If you want to understand backend quickly, use this order:

1. cmd/server/main.go
2. internal/handler/router.go
3. internal/middleware/auth.go
4. internal/handler/auth.go
5. internal/service/auth.go
6. migrations/schema.sql
7. dashboard role route files
8. docker-compose.yml and Makefile

This sequence shows both control flow and data flow with minimum confusion.
