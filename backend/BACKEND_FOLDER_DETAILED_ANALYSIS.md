# Backend Folder Detailed Analysis

## 1) Current Backend Structure

backend/
- .env.example
- docker-compose.yml
- go.mod
- go.sum
- BACKEND_FOLDER_DETAILED_ANALYSIS.md
- cmd/
  - server/
    - main.go
- internal/
  - config/
    - config.go
  - handler/
    - auth.go
  - middleware/
    - auth.go
    - cors.go
    - logger.go
    - recovery.go
  - service/
    - auth.go

## 2) Architecture Overview

This backend currently follows a clean layered pattern:

- Entry and wiring layer:
  - cmd/server/main.go
  - Loads config, builds dependencies, registers routes, and starts server.

- Middleware layer:
  - internal/middleware/*.go
  - Cross-cutting concerns such as logging, panic recovery, CORS, JWT auth, and role checks.

- Handler layer:
  - internal/handler/auth.go
  - HTTP-level request/response translation and validation.

- Service layer:
  - internal/service/auth.go
  - Business logic for login, DB user lookup, bcrypt verification, JWT generation.

- Configuration layer:
  - internal/config/config.go
  - Centralized typed config loading + validation.

- Infra metadata:
  - docker-compose.yml
  - .env.example
  - go.mod and go.sum

## 3) Folder and File Purpose with Code Explanation

## backend/.env.example

Purpose:
- Template of all environment variables needed to run the backend.

Why it is used:
- Provides a standard contract for local/dev/prod configuration.
- Prevents hardcoding credentials and runtime values in source code.

Important keys and their meaning:
- APP_ENV, APP_PORT: app mode and listening port.
- POSTGRES_*: database host, credentials, db name, ssl mode, max connections.
- REDIS_*: redis host/port/auth/db index.
- JWT_SECRET, JWT_TTL_HOURS: token signing key and expiry.
- CORS_*: allowed origins/methods/headers and cookie credential behavior.

Notes:
- JWT secret must be at least 32 characters based on code validation.

---

## backend/docker-compose.yml

Purpose:
- Brings up local infrastructure services required by backend: PostgreSQL with PostGIS and Redis.

Why it is used:
- One-command reproducible local backend dependencies.
- Eliminates manual installation friction.

What each service does:
- postgres service:
  - image postgis/postgis:16-3.4
  - persistent volume postgres_data
  - health check with pg_isready
- redis service:
  - image redis:7-alpine
  - append-only persistence enabled
  - persistent volume redis_data
  - health check with redis-cli ping

Design choices:
- restart unless-stopped for resilience.
- explicit health checks to support readiness diagnostics.

---

## backend/go.mod

Purpose:
- Declares Go module identity and dependency graph.

Why it is used:
- Required by Go tooling to resolve imports and versions.

Key direct dependencies and rationale:
- github.com/gin-gonic/gin
  - HTTP router and middleware framework.
- github.com/jackc/pgx/v5
  - PostgreSQL driver and connection pooling.
- github.com/redis/go-redis/v9
  - Redis client.
- go.uber.org/zap
  - Structured high-performance logging.
- github.com/golang-jwt/jwt/v5
  - JWT parsing and token signing.
- golang.org/x/crypto
  - bcrypt password hash verification.

Indirect dependencies:
- Pulled by direct packages for JSON codecs, validators, networking, low-level runtime support, etc.

---

## backend/go.sum

Purpose:
- Stores checksums of exact module versions downloaded.

Why it is used:
- Supply-chain integrity and reproducible builds.
- Go verifies downloaded modules against these checksums.

---

## backend/cmd/server/main.go

Purpose:
- Main app bootstrap and runtime lifecycle orchestration.

What this file does step-by-step:
1. Loads typed config through config.Load.
2. Initializes logger through middleware.NewLogger.
3. Creates DB pool and validates connection via ping.
4. Creates Redis client and validates connection via ping.
5. Builds Gin engine and applies middleware chain:
   - request logger
   - panic recovery
   - CORS
6. Creates auth service and auth handler.
7. Registers routes:
   - GET /health
   - POST /api/v1/auth/login
   - protected admin route group with:
     - JWT middleware
     - admin role middleware
     - GET /api/v1/admin/me
8. Starts HTTP server with read header timeout.
9. Handles graceful shutdown on SIGINT/SIGTERM.

Why this design is good:
- Clear startup sequence.
- Early failure on bad config or infra connectivity.
- Proper graceful shutdown pattern for production readiness.

Internal helper functions:
- newPostgresPool:
  - Parses DSN, sets max conns, pings DB, returns pool.
- newRedisClient:
  - Configures redis client, pings redis.
- waitForShutdown:
  - Blocks on signals and cleanly shuts down server.

---

## backend/internal/config/config.go

Purpose:
- Central, typed configuration loader and validator.

What is defined:
- Config root struct with nested sections:
  - ServerConfig
  - DatabaseConfig
  - RedisConfig
  - AuthConfig
  - CORSConfig

Key behaviors:
- Reads env with fallback defaults.
- Converts int and bool values safely.
- Parses CSV env values into string slices.
- Validates critical runtime constraints:
  - APP_PORT cannot be empty
  - JWT secret minimum length 32
  - JWT TTL must be positive

Database helper:
- DatabaseConfig.DSN builds pgx-compatible DSN string.

Why this approach matters:
- Keeps runtime configuration predictable.
- Fails fast on insecure or invalid auth config.

---

## backend/internal/middleware/logger.go

Purpose:
- Provides structured request logging and logger factory.

Functions:
- NewLogger:
  - Uses development logger in development mode, production logger otherwise.
  - Sets ISO8601 timestamp encoding.
- RequestLogger:
  - Logs each request status, method, path, client IP, user agent, latency.

Why useful:
- Essential observability baseline for debugging and monitoring.

---

## backend/internal/middleware/recovery.go

Purpose:
- Protects the server from panic crashes during request handling.

What it does:
- Uses custom Gin recovery handler.
- Logs recovered panic details.
- Returns safe generic 500 error JSON to client.

Why useful:
- Prevents process crash from unexpected panics.
- Avoids leaking sensitive panic details to API consumers.

---

## backend/internal/middleware/cors.go

Purpose:
- Manages browser CORS behavior for API access from frontend origins.

What it does:
- Builds allowed-origin lookup map.
- Sets allow-methods and allow-headers from config.
- Optionally sets allow-credentials.
- Handles preflight OPTIONS with 204.

Why useful:
- Enables frontend dashboard apps to call backend APIs securely.
- Restricts requests to approved origins when configured.

---

## backend/internal/middleware/auth.go

Purpose:
- JWT authentication and authorization middleware.

What it contains:
- Context keys for user_id, role, name, email.
- AuthClaims structure for JWT claims parsing.
- Auth middleware:
  - Extracts bearer token.
  - Validates HS256 token signature.
  - Validates token expiry/validity via jwt library.
  - Stores claims in request context for downstream handlers.
- RequireRole middleware:
  - Allows only exact required role.
- RequireAnyRole middleware:
  - Allows any one role from a provided list.
- extractBearerToken helper:
  - Parses Authorization header robustly.

Why useful:
- Enforces protected access to admin APIs.
- Keeps role logic reusable and centralized.

---

## backend/internal/service/auth.go

Purpose:
- Encapsulates login business logic.

Key types:
- AuthService:
  - Holds DB pool, JWT secret, and token TTL.
- LoginResult:
  - API result payload with token and user summary.
- User:
  - Lightweight auth user view.
- JWTClaims:
  - Claim payload used in generated JWT.

Login flow implementation:
1. Query users table by email.
2. If no row, return invalid credentials.
3. If user inactive, return inactive error.
4. Compare stored password hash against input password using bcrypt.
5. Build JWT claims with subject, issued time, expiry.
6. Sign token using HS256 and configured secret.
7. Return token plus user object.

Why this service abstraction is useful:
- Keeps HTTP layer thin.
- Easy to test auth business logic separately.
- Central place for auth rule changes.

Data assumptions currently required:
- users table includes:
  - id
  - email
  - name
  - role
  - password_hash
  - is_active

---

## backend/internal/handler/auth.go

Purpose:
- HTTP endpoint layer for login.

What it does:
- Defines request schema with Gin binding rules:
  - email required and valid format
  - password required and minimum length 8
- Calls auth service Login.
- Maps domain errors to HTTP responses:
  - 401 for invalid credentials
  - 403 for inactive account
  - 500 for unexpected failures
- Returns token and user payload on success.

Why this handler is useful:
- Keeps validation and HTTP concern localized.
- Keeps service contract clear and reusable.

---

## 4) Current Route Map

Public routes:
- GET /health
- POST /api/v1/auth/login

Protected admin routes:
- GET /api/v1/admin/me
  - requires Authorization: Bearer token
  - requires role admin

## 5) Request Flow (Login and Protected Admin)

Login request flow:
1. Client sends POST /api/v1/auth/login with email/password.
2. Handler validates body.
3. AuthService fetches user and verifies bcrypt password.
4. AuthService signs JWT and returns it.
5. Handler returns token + user JSON.

Protected route flow:
1. Client sends GET /api/v1/admin/me with bearer token.
2. Auth middleware validates token and injects user context.
3. RequireRole middleware verifies admin role.
4. Route handler returns user context payload.

## 6) Strengths and Gaps (Current Snapshot)

Strengths:
- Good layered structure for future growth.
- Fast fail config validation.
- Security baseline with JWT and role middleware.
- Structured request logging and panic recovery.
- Infra reproducibility via docker-compose.

Gaps to complete next:
- No migration/seed scripts yet for users table.
- No repository layer abstraction yet.
- No tests added yet for auth and middleware behavior.
- No ready endpoint currently.
- No audit middleware yet.

## 7) All Commands Used During Setup and Debugging

Below is the consolidated command list used while implementing and validating this backend.

## A) Environment and installer detection

1. Get-Command winget
- Use case: Check if winget exists on machine.
- Purpose: Decide package manager path for installing Go.

2. Get-Command choco
- Use case: Check chocolatey availability as backup.
- Purpose: Secondary installer option.

3. Get-Command scoop
- Use case: Check scoop availability as backup.
- Purpose: Alternate installer path.

## B) Install and validate Go toolchain

4. winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements
- Use case: Install or upgrade official Go distribution.
- Purpose: Fix go command not recognized issue.

5. Test-Path C:\Program Files\Go\bin\go.exe
- Use case: Confirm Go binary physically exists.
- Purpose: Distinguish install issue vs PATH issue.

6. Get-ChildItem C:\Program Files\Go\bin
- Use case: Inspect Go installation directory.
- Purpose: Verify go.exe and gofmt.exe presence.

7. [Environment]::GetEnvironmentVariable("Path","Machine")
8. [Environment]::GetEnvironmentVariable("Path","User")
- Use case: Inspect PATH values.
- Purpose: Check if Go path is configured globally.

9. $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
- Use case: Refresh PATH in current PowerShell session.
- Purpose: Make newly installed Go visible immediately without restarting terminal.

10. go version
11. C:\Program Files\Go\bin\go.exe version
- Use case: Confirm Go command works from PATH and absolute path.
- Purpose: Final verification of toolchain availability.

## C) Dependency and module management

12. go mod tidy
- Use case: Resolve imports, add missing modules, remove unused modules.
- Purpose: Keep go.mod and go.sum consistent.

13. go get github.com/gin-gonic/gin@v1.10.0 github.com/jackc/pgx/v5@v5.6.0 github.com/redis/go-redis/v9@v9.6.1 go.uber.org/zap@v1.27.0
- Use case: Force-add direct dependencies with explicit versions.
- Purpose: Populate missing dependency/checksum cases.

14. go get github.com/golang-jwt/jwt/v5@v5.2.1
- Use case: Add JWT dependency for auth middleware and service.
- Purpose: Enable token parsing/signing.

## D) Formatting and build validation

15. gofmt -w cmd/server/main.go internal/config/config.go internal/middleware/logger.go internal/middleware/recovery.go internal/middleware/cors.go
- Use case: Format initial backend files.
- Purpose: Standard Go formatting consistency.

16. gofmt -w cmd/server/main.go internal/config/config.go internal/middleware/auth.go internal/service/auth.go internal/handler/auth.go
- Use case: Format auth implementation files.
- Purpose: Standard Go formatting consistency after auth additions.

17. go test ./...
- Use case: Compile and test all packages recursively.
- Purpose: Validate backend build integrity quickly.

18. go test -v ./...
- Use case: Verbose build/test output.
- Purpose: Better diagnostics when plain go test output is insufficient.

19. go test ./cmd/server ./internal/config ./internal/handler ./internal/middleware ./internal/service
- Use case: Explicitly test selected package set.
- Purpose: Narrow and confirm package-level compilation.

20. cmd /c "go test ./... && echo EXIT=%ERRORLEVEL%"
- Use case: Run test via cmd to inspect final exit status behavior.
- Purpose: Troubleshoot PowerShell output/exit signal confusion.

## E) Go environment diagnostics

21. go env GOFLAGS
22. go env GOMOD
23. go env GOPROXY
- Use case: Inspect Go runtime/module environment configuration.
- Purpose: Diagnose module/checksum anomalies.

24. Write-Output "GOFLAGS=$(go env GOFLAGS)"
25. Write-Output "GOMOD=$(go env GOMOD)"
26. Write-Output "GOPROXY=$(go env GOPROXY)"
- Use case: PowerShell-friendly printed diagnostics.
- Purpose: Human-readable environment state check.

27. go mod tidy *>&1; Write-Output "EXIT=$LASTEXITCODE"
- Use case: Capture all output streams and explicit exit code.
- Purpose: Confirm tidy success when output looked partial.

28. go list ./...
- Use case: List all packages in current module.
- Purpose: Validate package discovery scope.

## F) File inventory and inspection commands

29. Get-ChildItem -Recurse -File | ForEach-Object { $_.FullName }
- Use case: Full file inventory of backend folder.
- Purpose: Ensure analysis covers every file.

## 8) Practical Runbook for You

1. Ensure environment file values are set (especially JWT_SECRET with 32+ chars).
2. Start infra from backend folder:
   - docker compose up -d
3. Verify backend build:
   - go test ./...
4. Start backend app:
   - go run ./cmd/server
5. Hit health endpoint:
   - GET http://localhost:8080/health
6. Test login endpoint:
   - POST http://localhost:8080/api/v1/auth/login
7. Use returned token for admin route:
   - GET http://localhost:8080/api/v1/admin/me

## 9) Summary

The backend folder currently gives you a solid Day 1 foundation:
- runtime bootstrap
- config system
- dockerized dependencies
- middleware chain
- login service + JWT auth + admin role guard

From here, the fastest next milestone is adding migrations + seed admin user + basic admin feature endpoints on top of this structure.
