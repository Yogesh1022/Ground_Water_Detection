# Backend Dependency Diagram (Over2)

Date: 2026-03-15
Scope: backend folder dependency and execution map

## 1) One-page architecture view

```mermaid
flowchart TD
    A[Client: Browser or API Consumer] --> B[Gin HTTP Server]

    subgraph Boot[Startup Orchestration]
      C[cmd/server/main.go]
      D[internal/config/config.go]
      E[internal/middleware/logger.go]
      F[internal/middleware/recovery.go]
      G[internal/middleware/cors.go]
      H[internal/handler/router.go]
      I[internal/handler/auth.go]
      J[internal/service/auth.go]
      K[(PostgreSQL)]
      L[(Redis)]
    end

    C --> D
    C --> E
    C --> K
    C --> L
    C --> H
    H --> I
    I --> J
    J --> K

    B --> E
    B --> F
    B --> G

    subgraph Authz[Request Protection]
      M[internal/middleware/auth.go]
      N[Role Gate: citizen, gov, admin]
    end

    B --> M
    M --> N

    subgraph RoleRoutes[Role-scoped endpoint handlers]
      O[internal/dashboard/common_user/handler/routes.go]
      P[internal/dashboard/govn_user/handler/routes.go]
      Q[internal/dashboard/admin/handler/routes.go]
    end

    N --> O
    N --> P
    N --> Q

    subgraph Infra[Runtime and Data Layer]
      R[docker-compose.yml]
      S[Dockerfile]
      T[.env.example]
      U[migrations/schema.sql]
      V[migrations/schema_local.sql]
      W[Makefile]
      X[go.mod and go.sum]
    end

    R --> K
    R --> L
    R --> C
    T --> C
    U --> K
    V --> K
    W --> C
    X --> C
```

## 2) Request pipeline

1. Incoming HTTP request reaches Gin server created in cmd/server/main.go.
2. Middleware chain executes in order: request logger, panic recovery, then CORS.
3. Router resolves path and method in internal/handler/router.go.
4. Protected groups run JWT middleware in internal/middleware/auth.go.
5. Role middleware validates required role.
6. Final role-specific handler executes and returns JSON response.

## 3) Current implemented business path

1. Fully implemented path is authentication:
   - POST /api/v1/auth/login
2. Role starter path implemented:
   - GET /api/v1/common-user/me
   - GET /api/v1/govn-user/me
   - GET /api/v1/admin/me
3. Most domain/business endpoints are planned but not implemented yet.

## 4) Runtime dependencies

1. Config and secrets: .env.example copied to .env for runtime values.
2. Database: PostgreSQL (PostGIS image in compose).
3. Cache: Redis.
4. Schema bootstrap: schema.sql is mounted as Docker init migration.
5. Build and run control: Makefile targets and go toolchain.

## 5) Practical read order for backend understanding

1. cmd/server/main.go
2. internal/config/config.go
3. internal/handler/router.go
4. internal/middleware/auth.go
5. internal/handler/auth.go
6. internal/service/auth.go
7. dashboard role route files
8. migrations/schema.sql
9. docker-compose.yml and Makefile
