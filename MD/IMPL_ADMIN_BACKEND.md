# Admin Dashboard — Complete Backend Implementation Guide

> Role: `admin`  
> Route prefix: `/api/v1/admin`  
> Auth: `Authorization: Bearer <jwt>` with `role=admin`

---

## Overview

The Admin dashboard is the **first priority** to implement. It manages all other users, wells, ML models, system settings, and audit logs. Nothing in Gov or User dashboards can work until the admin can create gov officer accounts.

This guide is updated for a **production-grade Go backend** implementation using:

- JWT authentication
- RBAC authorization
- Layered architecture (`handler -> service -> repository`)
- Audit logging for all write operations
- ML model and data-source management APIs
- Redis caching for read-heavy admin analytics

## Project Reality Check (Current Repo)

Before implementation, align with actual repository state:

1. `backend/internal/dashboard/admin/handler/routes.go` is currently a stub (`/me` only).
2. Shared router currently does not pass DB/Redis dependencies to dashboard modules.
3. PostgreSQL schema already has required admin tables: `users`, `wells`, `audit_log`, `system_settings`, `ml_model_registry`, `data_sources`, `predictions`, `complaints`, and `district_stats`.
4. Redis is configured and connected in server bootstrap, but not yet used by admin services.

Treat this as the canonical implementation sequence for admin backend delivery.

## Delivery Target

Build a complete admin backend under `/api/v1/admin` that is secure, observable, testable, and deployable.

Success means:

- Admin can manage users and wells.
- Admin can view overview analytics, model registry, data sources, and activity logs.
- All writes are audited.
- Read-heavy overview/list endpoints are cache-enabled with Redis.
- `go build ./...` passes and smoke tests pass.

## Implementation Order (Recommended)

Use this exact order to avoid refactor churn and compile breakage:

1. Fix shared dependency wiring in router/main (DB + optional Redis injection).
2. Create `dto` package.
3. Create `repository` package.
4. Create `service` package.
5. Replace admin `handler/routes.go`.
6. Add Redis cache strategy to overview and list endpoints.
7. Build, run, and smoke test all admin endpoints.
8. Harden with error mapping, pagination defaults, and audit verification.

## Current Codebase Alignment (March 2026)

- `backend/internal/dashboard/admin/handler/routes.go` is still a stub (`/me` only).
- Shared router currently has signature `RegisterRoutes(r *gin.Engine, authHandler *AuthHandler, jwtSecret string)` and does **not** pass DB into admin routes.
- `cmd/server/main.go` already creates `dbPool` and should pass it into shared route registration.
- `backend/migrations/schema.sql` already contains required tables for admin endpoints (`users`, `wells`, `audit_log`, `system_settings`, `ml_model_registry`, `data_sources`, `predictions`, `complaints`, `district_stats`).

## Execution Checklist

- [ ] Phase 0 complete: router/main dependency wiring fixed.
- [ ] Phase 1 complete: admin DTO contracts finalized.
- [ ] Phase 2 complete: repository methods implemented and SQL verified.
- [ ] Phase 3 complete: service business rules + audit writes implemented.
- [ ] Phase 4 complete: all admin handlers/routes implemented.
- [ ] Phase 5 complete: Redis cache added for overview/list endpoints.
- [ ] Phase 6 complete: build, run, smoke test, and verify logs/metrics.

---

## Production Step-by-Step Implementation Plan

### Phase 0 - Bootstrap and Dependency Wiring

Objective: make dashboard modules capable of using database and cache dependencies.

1. Update shared router signature to accept dependencies.
2. Pass `dbPool` from `cmd/server/main.go` into shared router registration.
3. If Redis cache is implemented immediately, pass `redisClient` into admin route registration or service constructors.
4. Keep middleware order unchanged: request logger -> recovery -> CORS -> auth -> role check.

Exit criteria:

- App compiles after router signature change.
- Admin route registration receives DB pool.

### Phase 1 - DTO Contract Finalization

Objective: define stable request/response contracts for API and internal layers.

1. Keep existing DTO set from this document.
2. Add explicit pagination defaults handling at service level (`page>=1`, `limit in [1,100]`).
3. Ensure `OverviewResponse.AvgDepthMbgl` remains `float64` end-to-end.
4. Keep role constraints strict: `citizen | gov | admin`.

Exit criteria:

- All handler bindings compile and validate as expected.
- No ambiguous or nullable JSON fields in primary responses.

### Phase 2 - Repository Layer Implementation

Objective: implement all DB access with robust SQL and error handling.

1. Implement user repository methods: list/get/create/update/activate/suspend/delete/count-by-role.
2. Implement well repository methods: list/create/count (and optional get/update if needed).
3. Implement audit repository methods: write log + paginated list.
4. Implement settings repository methods: list + upsert.
5. Implement model repository methods: list models, list data sources, overview stats.
6. Use parameterized SQL for all dynamic filters.
7. Convert `pgx.ErrNoRows` to explicit domain-friendly errors.

Exit criteria:

- Repository layer passes build and manual query checks.
- Pagination/count SQL returns consistent totals.

### Phase 3 - Service Layer (Business Rules)

Objective: enforce admin domain rules and centralize side effects.

1. Implement user service operations and self-protection rules:
    - cannot suspend own account
    - cannot delete own account
2. Enforce audit write for every mutation endpoint.
3. Implement overview service with aggregated KPIs.
4. Implement settings service bulk-update transaction behavior.
5. Implement model service read operations.

Exit criteria:

- Rules are enforced regardless of handler behavior.
- Every write path triggers an audit log insertion.

### Phase 4 - Handler and Route Completion

Objective: replace admin stub with all production endpoints.

1. Keep `/me` identity endpoint.
2. Implement `/overview`.
3. Implement user lifecycle endpoints (`list/get/create/update/suspend/activate/delete`).
4. Implement wells endpoints (`list/create`).
5. Implement settings endpoints (`list/update`).
6. Implement model and data-source endpoints.
7. Implement activity log endpoint.
8. Return stable status codes and simple error payloads.

Exit criteria:

- All admin endpoints from API reference respond correctly.
- Input validation errors return `400`, auth failures remain `401/403`, not found returns `404`.

### Phase 5 - Redis Caching (Production Hardening)

Objective: reduce DB load and improve latency for read-heavy endpoints.

Recommended cache-aside targets:

1. `GET /admin/overview`
    - Key: `admin:overview:v1`
    - TTL: 300s (or from `system_settings`)
2. `GET /admin/users` paginated listing
    - Key pattern: `admin:users:{query_hash}`
    - TTL: 60-120s
3. `GET /admin/activity-log` (optional)
    - Key pattern: `admin:audit:{query_hash}`
    - TTL: 30-60s

Invalidation strategy:

- On any user write (`create/update/suspend/activate/delete`): invalidate `admin:overview:*` and `admin:users:*`.
- On settings update impacting analytics: invalidate `admin:overview:*`.

Exit criteria:

- Cache hit/miss behavior is visible in logs.
- No stale critical data after write operations.

### Phase 6 - Verification and Release Gate

Objective: prove end-to-end correctness before merging.

1. Run `go build ./...`.
2. Start dependencies and run `air` from `backend`.
3. Perform login and endpoint smoke tests.
4. Validate audit entries for each write endpoint.
5. Validate pagination metadata on list endpoints.
6. Validate self-protection rules with admin token.
7. Validate cache invalidation by observing changed overview/list after writes.

Exit criteria:

- All checklist items pass.
- Admin dashboard backend is ready for frontend integration.

---

## Files to Create

```
backend/internal/dashboard/admin/
├── dto/
│   └── dto.go
├── repository/
│   ├── user_repo.go
│   ├── well_repo.go
│   ├── audit_repo.go
│   ├── settings_repo.go
│   └── model_repo.go
├── service/
│   ├── user_service.go
│   ├── well_service.go
│   ├── overview_service.go
│   ├── settings_service.go
│   └── model_service.go
└── handler/
    └── routes.go          ← already exists (stub), replace completely
```

---

## Step 1 — DTOs (`dto/dto.go`)

```go
package dto

import "time"

// ── Pagination ──────────────────────────────────────────────────────────────

type PaginationQuery struct {
    Page  int `form:"page,default=1"    binding:"min=1"`
    Limit int `form:"limit,default=20"  binding:"min=1,max=100"`
}

func (p PaginationQuery) Offset() int { return (p.Page - 1) * p.Limit }

type PagedMeta struct {
    Page       int   `json:"page"`
    Limit      int   `json:"limit"`
    TotalItems int64 `json:"total_items"`
    TotalPages int   `json:"total_pages"`
}

// ── Users ────────────────────────────────────────────────────────────────────

type ListUsersQuery struct {
    PaginationQuery
    Role     string `form:"role"`
    District string `form:"district"`
    Search   string `form:"search"`   // matches name or email
    Active   *bool  `form:"active"`
}

type UserResponse struct {
    ID        int64     `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Role      string    `json:"role"`
    District  string    `json:"district"`
    Phone     string    `json:"phone"`
    IsActive  bool      `json:"is_active"`
    CreatedAt time.Time `json:"created_at"`
}

type ListUsersResponse struct {
    Data []UserResponse `json:"data"`
    Meta PagedMeta      `json:"meta"`
}

type CreateUserRequest struct {
    Email    string `json:"email"    binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Name     string `json:"name"     binding:"required"`
    Role     string `json:"role"     binding:"required,oneof=citizen gov admin"`
    District string `json:"district"`
    Phone    string `json:"phone"`
}

type UpdateUserRequest struct {
    Name     string `json:"name"`
    District string `json:"district"`
    Phone    string `json:"phone"`
    Role     string `json:"role" binding:"omitempty,oneof=citizen gov admin"`
}

// ── Wells ────────────────────────────────────────────────────────────────────

type ListWellsQuery struct {
    PaginationQuery
    District string `form:"district"`
    Active   *bool  `form:"active"`
}

type WellResponse struct {
    ID               int64     `json:"id"`
    Name             string    `json:"name"`
    District         string    `json:"district"`
    Taluka           string    `json:"taluka"`
    Village          string    `json:"village"`
    Latitude         float64   `json:"latitude"`
    Longitude        float64   `json:"longitude"`
    WellType         string    `json:"well_type"`
    DepthTotalM      float64   `json:"depth_total_m"`
    AquiferType      string    `json:"aquifer_type"`
    AffectedFamilies int       `json:"affected_families"`
    IsActive         bool      `json:"is_active"`
    CreatedAt        time.Time `json:"created_at"`
}

type ListWellsResponse struct {
    Data []WellResponse `json:"data"`
    Meta PagedMeta      `json:"meta"`
}

type CreateWellRequest struct {
    Name             string  `json:"name"      binding:"required"`
    District         string  `json:"district"  binding:"required"`
    Taluka           string  `json:"taluka"`
    Village          string  `json:"village"`
    Latitude         float64 `json:"latitude"  binding:"required"`
    Longitude        float64 `json:"longitude" binding:"required"`
    WellType         string  `json:"well_type"`
    DepthTotalM      float64 `json:"depth_total_m"`
    AquiferType      string  `json:"aquifer_type"`
    AffectedFamilies int     `json:"affected_families"`
}

// ── Overview KPIs ─────────────────────────────────────────────────────────────

type OverviewResponse struct {
    TotalUsers       int64   `json:"total_users"`
    ActiveCitizens   int64   `json:"active_citizens"`
    GovOfficers      int64   `json:"gov_officers"`
    TotalWells       int64   `json:"total_wells"`
    TotalPredictions int64   `json:"total_predictions"`
    OpenComplaints   int64   `json:"open_complaints"`
    TotalDistricts   int     `json:"total_districts"`
    AvgDepthMbgl     float64 `json:"avg_depth_mbgl"`
}

// ── Settings ──────────────────────────────────────────────────────────────────

type SettingResponse struct {
    Key         string      `json:"key"`
    Value       interface{} `json:"value"`
    Description string      `json:"description"`
    UpdatedAt   time.Time   `json:"updated_at"`
}

type UpdateSettingsRequest struct {
    Settings map[string]interface{} `json:"settings" binding:"required"`
}

// ── ML Models ─────────────────────────────────────────────────────────────────

type ModelResponse struct {
    ID           int64     `json:"id"`
    ModelName    string    `json:"model_name"`
    Version      string    `json:"version"`
    Status       string    `json:"status"`
    R2Score      float64   `json:"r2_score"`
    RMSE         float64   `json:"rmse"`
    MAE          float64   `json:"mae"`
    TrainingRows int       `json:"training_rows"`
    FeatureCount int       `json:"feature_count"`
    Notes        string    `json:"notes"`
    TrainedAt    time.Time `json:"trained_at"`
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

type AuditLogQuery struct {
    PaginationQuery
    ActorID     int64  `form:"actor_id"`
    Action      string `form:"action"`
    TargetTable string `form:"target_table"`
}

type AuditLogEntry struct {
    ID          int64       `json:"id"`
    ActorID     int64       `json:"actor_id"`
    ActorRole   string      `json:"actor_role"`
    Action      string      `json:"action"`
    TargetTable string      `json:"target_table"`
    TargetID    int64       `json:"target_id"`
    Details     interface{} `json:"details"`
    IPAddress   string      `json:"ip_address"`
    CreatedAt   time.Time   `json:"created_at"`
}

type AuditLogResponse struct {
    Data []AuditLogEntry `json:"data"`
    Meta PagedMeta       `json:"meta"`
}

// ── Alerts ────────────────────────────────────────────────────────────────────

type CreateAlertRequest struct {
    Type       string  `json:"type"    binding:"required,oneof=critical warning info success"`
    District   string  `json:"district"`
    Title      string  `json:"title"   binding:"required"`
    Message    string  `json:"message" binding:"required"`
    Confidence float64 `json:"confidence_pct"`
    Source     string  `json:"source"`
}

type AlertResponse struct {
    ID           int64     `json:"id"`
    Type         string    `json:"type"`
    District     string    `json:"district"`
    Title        string    `json:"title"`
    Message      string    `json:"message"`
    ConfidencePct float64  `json:"confidence_pct"`
    Source       string    `json:"source"`
    IsActive     bool      `json:"is_active"`
    CreatedAt    time.Time `json:"created_at"`
}

// ── Data Sources ──────────────────────────────────────────────────────────────

type DataSourceResponse struct {
    ID              int64     `json:"id"`
    SourceName      string    `json:"source_name"`
    SourceType      string    `json:"source_type"`
    Description     string    `json:"description"`
    RecordCount     int64     `json:"record_count"`
    UpdateFrequency string    `json:"update_frequency"`
    Coverage        string    `json:"coverage"`
    QualityScore    float64   `json:"quality_score"`
    IsActive        bool      `json:"is_active"`
    LastSyncedAt    time.Time `json:"last_synced_at"`
}
```

---

## Step 2 — Repository Layer

### `repository/user_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "golang.org/x/crypto/bcrypt"
)

type UserRepo struct{ db *pgxpool.Pool }

func NewUserRepo(db *pgxpool.Pool) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) List(ctx context.Context, q dto.ListUsersQuery) ([]dto.UserResponse, int64, error) {
    where := "WHERE 1=1"
    args := []interface{}{}
    i := 1

    if q.Role != "" {
        where += fmt.Sprintf(" AND role = $%d", i); args = append(args, q.Role); i++
    }
    if q.District != "" {
        where += fmt.Sprintf(" AND district = $%d", i); args = append(args, q.District); i++
    }
    if q.Search != "" {
        where += fmt.Sprintf(" AND (name ILIKE $%d OR email ILIKE $%d)", i, i)
        args = append(args, "%"+q.Search+"%"); i++
    }
    if q.Active != nil {
        where += fmt.Sprintf(" AND is_active = $%d", i); args = append(args, *q.Active); i++
    }

    var total int64
    if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM users "+where, args...).Scan(&total); err != nil {
        return nil, 0, fmt.Errorf("count users: %w", err)
    }

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at
         FROM users `+where+fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil {
        return nil, 0, fmt.Errorf("list users: %w", err)
    }
    defer rows.Close()

    var users []dto.UserResponse
    for rows.Next() {
        var u dto.UserResponse
        if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt); err != nil {
            return nil, 0, err
        }
        users = append(users, u)
    }
    return users, total, rows.Err()
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (dto.UserResponse, error) {
    var u dto.UserResponse
    err := r.db.QueryRow(ctx,
        `SELECT id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at
         FROM users WHERE id = $1`, id,
    ).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
    if err != nil {
        if err == pgx.ErrNoRows { return u, fmt.Errorf("user not found") }
        return u, fmt.Errorf("get user: %w", err)
    }
    return u, nil
}

func (r *UserRepo) Create(ctx context.Context, req dto.CreateUserRequest) (dto.UserResponse, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
    if err != nil { return dto.UserResponse{}, fmt.Errorf("hash password: %w", err) }

    var u dto.UserResponse
    err = r.db.QueryRow(ctx,
        `INSERT INTO users (email, password_hash, name, role, district, phone)
         VALUES ($1, $2, $3, $4, NULLIF($5,''), NULLIF($6,''))
         RETURNING id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at`,
        req.Email, string(hash), req.Name, req.Role, req.District, req.Phone,
    ).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
    if err != nil { return u, fmt.Errorf("create user: %w", err) }
    return u, nil
}

func (r *UserRepo) Update(ctx context.Context, id int64, req dto.UpdateUserRequest) (dto.UserResponse, error) {
    var u dto.UserResponse
    err := r.db.QueryRow(ctx,
        `UPDATE users SET
           name     = COALESCE(NULLIF($2,''), name),
           district = COALESCE(NULLIF($3,''), district),
           phone    = COALESCE(NULLIF($4,''), phone),
           role     = COALESCE(NULLIF($5,''), role)
         WHERE id = $1
         RETURNING id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at`,
        id, req.Name, req.District, req.Phone, req.Role,
    ).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
    if err != nil {
        if err == pgx.ErrNoRows { return u, fmt.Errorf("user not found") }
        return u, fmt.Errorf("update user: %w", err)
    }
    return u, nil
}

func (r *UserRepo) SetActive(ctx context.Context, id int64, active bool) error {
    tag, err := r.db.Exec(ctx, `UPDATE users SET is_active = $2 WHERE id = $1`, id, active)
    if err != nil { return fmt.Errorf("set active: %w", err) }
    if tag.RowsAffected() == 0 { return fmt.Errorf("user not found") }
    return nil
}

func (r *UserRepo) Delete(ctx context.Context, id int64) error {
    tag, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
    if err != nil { return fmt.Errorf("delete user: %w", err) }
    if tag.RowsAffected() == 0 { return fmt.Errorf("user not found") }
    return nil
}

func (r *UserRepo) CountByRole(ctx context.Context) (map[string]int64, error) {
    rows, err := r.db.Query(ctx, `SELECT role, COUNT(*) FROM users GROUP BY role`)
    if err != nil { return nil, err }
    defer rows.Close()
    m := map[string]int64{}
    for rows.Next() {
        var role string; var cnt int64
        if err := rows.Scan(&role, &cnt); err != nil { return nil, err }
        m[role] = cnt
    }
    return m, rows.Err()
}
```

### `repository/well_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type WellRepo struct{ db *pgxpool.Pool }

func NewWellRepo(db *pgxpool.Pool) *WellRepo { return &WellRepo{db: db} }

func (r *WellRepo) List(ctx context.Context, q dto.ListWellsQuery) ([]dto.WellResponse, int64, error) {
    where := "WHERE 1=1"
    args := []interface{}{}
    i := 1
    if q.District != "" {
        where += fmt.Sprintf(" AND district = $%d", i); args = append(args, q.District); i++
    }
    if q.Active != nil {
        where += fmt.Sprintf(" AND is_active = $%d", i); args = append(args, *q.Active); i++
    }
    var total int64
    r.db.QueryRow(ctx, "SELECT COUNT(*) FROM wells "+where, args...).Scan(&total)

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, name, district, COALESCE(taluka,''), COALESCE(village,''),
                latitude, longitude, COALESCE(well_type,''), COALESCE(depth_total_m,0),
                COALESCE(aquifer_type,''), COALESCE(affected_families,0), is_active, created_at
         FROM wells `+where+fmt.Sprintf(` ORDER BY district, name LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil { return nil, 0, fmt.Errorf("list wells: %w", err) }
    defer rows.Close()

    var wells []dto.WellResponse
    for rows.Next() {
        var w dto.WellResponse
        rows.Scan(&w.ID, &w.Name, &w.District, &w.Taluka, &w.Village,
            &w.Latitude, &w.Longitude, &w.WellType, &w.DepthTotalM,
            &w.AquiferType, &w.AffectedFamilies, &w.IsActive, &w.CreatedAt)
        wells = append(wells, w)
    }
    return wells, total, rows.Err()
}

func (r *WellRepo) Create(ctx context.Context, req dto.CreateWellRequest) (dto.WellResponse, error) {
    var w dto.WellResponse
    err := r.db.QueryRow(ctx,
        `INSERT INTO wells (name, district, taluka, village, latitude, longitude,
                            well_type, depth_total_m, aquifer_type, affected_families)
         VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,NULLIF($7,''),$8,NULLIF($9,''),$10)
         RETURNING id, name, district, COALESCE(taluka,''), COALESCE(village,''),
                   latitude, longitude, COALESCE(well_type,''), COALESCE(depth_total_m,0),
                   COALESCE(aquifer_type,''), COALESCE(affected_families,0), is_active, created_at`,
        req.Name, req.District, req.Taluka, req.Village, req.Latitude, req.Longitude,
        req.WellType, req.DepthTotalM, req.AquiferType, req.AffectedFamilies,
    ).Scan(&w.ID, &w.Name, &w.District, &w.Taluka, &w.Village,
        &w.Latitude, &w.Longitude, &w.WellType, &w.DepthTotalM,
        &w.AquiferType, &w.AffectedFamilies, &w.IsActive, &w.CreatedAt)
    if err != nil { return w, fmt.Errorf("create well: %w", err) }
    return w, nil
}

func (r *WellRepo) Count(ctx context.Context) (int64, error) {
    var n int64
    r.db.QueryRow(ctx, `SELECT COUNT(*) FROM wells WHERE is_active = TRUE`).Scan(&n)
    return n, nil
}
```

### `repository/audit_repo.go`

```go
package repository

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepo struct{ db *pgxpool.Pool }

func NewAuditRepo(db *pgxpool.Pool) *AuditRepo { return &AuditRepo{db: db} }

// WriteLog inserts an audit record. Call from every write handler.
func (r *AuditRepo) WriteLog(ctx context.Context,
    actorID int64, actorRole, action, targetTable string,
    targetID int64, details interface{}, ip, requestID string,
) error {
    detailsJSON, _ := json.Marshal(details)
    _, err := r.db.Exec(ctx,
        `INSERT INTO audit_log (actor_id, actor_role, action, target_table, target_id, details, ip_address, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
        actorID, actorRole, action, targetTable, targetID, detailsJSON, ip, requestID,
    )
    return err
}

func (r *AuditRepo) List(ctx context.Context, q dto.AuditLogQuery) ([]dto.AuditLogEntry, int64, error) {
    where := "WHERE 1=1"
    args := []interface{}{}
    i := 1
    if q.ActorID > 0 {
        where += fmt.Sprintf(" AND actor_id = $%d", i); args = append(args, q.ActorID); i++
    }
    if q.Action != "" {
        where += fmt.Sprintf(" AND action = $%d", i); args = append(args, q.Action); i++
    }
    if q.TargetTable != "" {
        where += fmt.Sprintf(" AND target_table = $%d", i); args = append(args, q.TargetTable); i++
    }

    var total int64
    r.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_log "+where, args...).Scan(&total)

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, COALESCE(actor_id,0), COALESCE(actor_role::text,''),
                action, COALESCE(target_table,''), COALESCE(target_id,0),
                COALESCE(details,'{}'), COALESCE(ip_address::text,''), created_at
         FROM audit_log `+where+
            fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil { return nil, 0, fmt.Errorf("list audit: %w", err) }
    defer rows.Close()

    var entries []dto.AuditLogEntry
    for rows.Next() {
        var e dto.AuditLogEntry
        var detailsRaw []byte
        rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.Action, &e.TargetTable, &e.TargetID, &detailsRaw, &e.IPAddress, &e.CreatedAt)
        json.Unmarshal(detailsRaw, &e.Details)
        entries = append(entries, e)
    }
    return entries, total, rows.Err()
}
```

### `repository/settings_repo.go`

```go
package repository

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepo struct{ db *pgxpool.Pool }

func NewSettingsRepo(db *pgxpool.Pool) *SettingsRepo { return &SettingsRepo{db: db} }

func (r *SettingsRepo) GetAll(ctx context.Context) ([]dto.SettingResponse, error) {
    rows, err := r.db.Query(ctx,
        `SELECT key, value, COALESCE(description,''), updated_at FROM system_settings ORDER BY key`)
    if err != nil { return nil, fmt.Errorf("get settings: %w", err) }
    defer rows.Close()

    var settings []dto.SettingResponse
    for rows.Next() {
        var s dto.SettingResponse
        var valueRaw []byte
        rows.Scan(&s.Key, &valueRaw, &s.Description, &s.UpdatedAt)
        json.Unmarshal(valueRaw, &s.Value)
        settings = append(settings, s)
    }
    return settings, rows.Err()
}

func (r *SettingsRepo) Upsert(ctx context.Context, key string, value interface{}, updaterID int64) error {
    valueJSON, err := json.Marshal(value)
    if err != nil { return fmt.Errorf("marshal value: %w", err) }
    _, err = r.db.Exec(ctx,
        `INSERT INTO system_settings (key, value, updated_by_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by_id = $3, updated_at = NOW()`,
        key, valueJSON, updaterID,
    )
    return err
}
```

### `repository/model_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ModelRepo struct{ db *pgxpool.Pool }

func NewModelRepo(db *pgxpool.Pool) *ModelRepo { return &ModelRepo{db: db} }

func (r *ModelRepo) ListModels(ctx context.Context) ([]dto.ModelResponse, error) {
    rows, err := r.db.Query(ctx,
        `SELECT id, model_name, version, status::text,
                COALESCE(r2_score,0), COALESCE(rmse,0), COALESCE(mae,0),
                COALESCE(training_rows,0), COALESCE(feature_count,0),
                COALESCE(notes,''), COALESCE(trained_at, registered_at)
         FROM ml_model_registry ORDER BY registered_at DESC`)
    if err != nil { return nil, fmt.Errorf("list models: %w", err) }
    defer rows.Close()
    var models []dto.ModelResponse
    for rows.Next() {
        var m dto.ModelResponse
        rows.Scan(&m.ID, &m.ModelName, &m.Version, &m.Status,
            &m.R2Score, &m.RMSE, &m.MAE, &m.TrainingRows, &m.FeatureCount,
            &m.Notes, &m.TrainedAt)
        models = append(models, m)
    }
    return models, rows.Err()
}

func (r *ModelRepo) ListDataSources(ctx context.Context) ([]dto.DataSourceResponse, error) {
    rows, err := r.db.Query(ctx,
        `SELECT id, source_name, source_type, COALESCE(description,''),
                COALESCE(record_count,0), COALESCE(update_frequency,''),
                COALESCE(coverage,''), COALESCE(quality_score,0),
                is_active, COALESCE(last_synced_at, created_at)
         FROM data_sources ORDER BY source_name`)
    if err != nil { return nil, fmt.Errorf("list data sources: %w", err) }
    defer rows.Close()
    var ds []dto.DataSourceResponse
    for rows.Next() {
        var d dto.DataSourceResponse
        rows.Scan(&d.ID, &d.SourceName, &d.SourceType, &d.Description,
            &d.RecordCount, &d.UpdateFrequency, &d.Coverage, &d.QualityScore,
            &d.IsActive, &d.LastSyncedAt)
        ds = append(ds, d)
    }
    return ds, rows.Err()
}

func (r *ModelRepo) GetOverviewStats(ctx context.Context) (int64, int64, float64, error) {
    var totalPredictions, openComplaints int64
    r.db.QueryRow(ctx, `SELECT COUNT(*) FROM predictions`).Scan(&totalPredictions)
    r.db.QueryRow(ctx, `SELECT COUNT(*) FROM complaints WHERE status = 'open'`).Scan(&openComplaints)
    var avgDepth float64
    r.db.QueryRow(ctx, `SELECT COALESCE(AVG(avg_depth_mbgl),0) FROM district_stats`).Scan(&avgDepth)
    return totalPredictions, openComplaints, avgDepth, nil
}
```

---

## Step 3 — Service Layer

### `service/user_service.go`

```go
package service

import (
    "context"
    "errors"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type UserService struct {
    repo      *repository.UserRepo
    auditRepo *repository.AuditRepo
}

func NewUserService(repo *repository.UserRepo, auditRepo *repository.AuditRepo) *UserService {
    return &UserService{repo: repo, auditRepo: auditRepo}
}

func (s *UserService) List(ctx context.Context, q dto.ListUsersQuery) (dto.ListUsersResponse, error) {
    users, total, err := s.repo.List(ctx, q)
    if err != nil { return dto.ListUsersResponse{}, err }

    pages := int(total) / q.Limit
    if int(total)%q.Limit != 0 { pages++ }

    return dto.ListUsersResponse{
        Data: users,
        Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
    }, nil
}

func (s *UserService) GetByID(ctx context.Context, id int64) (dto.UserResponse, error) {
    return s.repo.GetByID(ctx, id)
}

func (s *UserService) Create(ctx context.Context, req dto.CreateUserRequest, actorID int64, actorRole, ip, requestID string) (dto.UserResponse, error) {
    user, err := s.repo.Create(ctx, req)
    if err != nil { return user, fmt.Errorf("create user: %w", err) }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "CREATE_USER", "users", user.ID,
        map[string]interface{}{"email": user.Email, "role": user.Role}, ip, requestID)
    return user, nil
}

func (s *UserService) Update(ctx context.Context, id int64, req dto.UpdateUserRequest, actorID int64, actorRole, ip, requestID string) (dto.UserResponse, error) {
    user, err := s.repo.Update(ctx, id, req)
    if err != nil { return user, err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "UPDATE_USER", "users", id,
        map[string]interface{}{"changes": req}, ip, requestID)
    return user, nil
}

func (s *UserService) Suspend(ctx context.Context, id int64, actorID int64, actorRole, ip, requestID string) error {
    if id == actorID { return errors.New("cannot suspend your own account") }
    if err := s.repo.SetActive(ctx, id, false); err != nil { return err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "SUSPEND_USER", "users", id, nil, ip, requestID)
    return nil
}

func (s *UserService) Activate(ctx context.Context, id int64, actorID int64, actorRole, ip, requestID string) error {
    if err := s.repo.SetActive(ctx, id, true); err != nil { return err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "ACTIVATE_USER", "users", id, nil, ip, requestID)
    return nil
}

func (s *UserService) Delete(ctx context.Context, id int64, actorID int64, actorRole, ip, requestID string) error {
    if id == actorID { return errors.New("cannot delete your own account") }
    if err := s.repo.Delete(ctx, id); err != nil { return err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "DELETE_USER", "users", id, nil, ip, requestID)
    return nil
}
```

### `service/overview_service.go`

```go
package service

import (
    "context"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type OverviewService struct {
    userRepo  *repository.UserRepo
    wellRepo  *repository.WellRepo
    modelRepo *repository.ModelRepo
}

func NewOverviewService(userRepo *repository.UserRepo, wellRepo *repository.WellRepo, modelRepo *repository.ModelRepo) *OverviewService {
    return &OverviewService{userRepo: userRepo, wellRepo: wellRepo, modelRepo: modelRepo}
}

func (s *OverviewService) GetOverview(ctx context.Context) (dto.OverviewResponse, error) {
    counts, err := s.userRepo.CountByRole(ctx)
    if err != nil { return dto.OverviewResponse{}, err }

    wells, err := s.wellRepo.Count(ctx)
    if err != nil { return dto.OverviewResponse{}, err }

    predictions, openComplaints, avgDepth, err := s.modelRepo.GetOverviewStats(ctx)
    if err != nil { return dto.OverviewResponse{}, err }

    return dto.OverviewResponse{
        TotalUsers:       counts["citizen"] + counts["gov"] + counts["admin"],
        ActiveCitizens:   counts["citizen"],
        GovOfficers:      counts["gov"],
        TotalWells:       wells,
        TotalPredictions: predictions,
        OpenComplaints:   openComplaints,
        TotalDistricts:   11,
        AvgDepthMbgl:     avgDepth,
    }, nil
}
```

### `service/settings_service.go`

```go
package service

import (
    "context"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type SettingsService struct {
    repo      *repository.SettingsRepo
    auditRepo *repository.AuditRepo
}

func NewSettingsService(repo *repository.SettingsRepo, auditRepo *repository.AuditRepo) *SettingsService {
    return &SettingsService{repo: repo, auditRepo: auditRepo}
}

func (s *SettingsService) GetAll(ctx context.Context) ([]dto.SettingResponse, error) {
    return s.repo.GetAll(ctx)
}

func (s *SettingsService) Update(ctx context.Context, req dto.UpdateSettingsRequest, actorID int64, actorRole, ip, requestID string) error {
    for key, value := range req.Settings {
        if err := s.repo.Upsert(ctx, key, value, actorID); err != nil {
            return err
        }
    }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "UPDATE_SETTINGS", "system_settings", 0,
        req.Settings, ip, requestID)
    return nil
}
```

---

## Step 4 — Handler (`handler/routes.go`) — Replace the stub completely

```go
package handler

import (
    "math"
    "net/http"
    "strconv"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/service"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes wires all admin routes onto the already-auth-guarded group.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool) {
    // Repositories
    userRepo     := repository.NewUserRepo(db)
    wellRepo     := repository.NewWellRepo(db)
    auditRepo    := repository.NewAuditRepo(db)
    settingsRepo := repository.NewSettingsRepo(db)
    modelRepo    := repository.NewModelRepo(db)

    // Services
    userSvc     := service.NewUserService(userRepo, auditRepo)
    overviewSvc := service.NewOverviewService(userRepo, wellRepo, modelRepo)
    settingsSvc := service.NewSettingsService(settingsRepo, auditRepo)

    // ── Identity ──────────────────────────────────────────────────────────
    rg.GET("/me", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "id":    c.GetInt64(middleware.ContextUserIDKey),
            "name":  c.GetString(middleware.ContextNameKey),
            "email": c.GetString(middleware.ContextEmailKey),
            "role":  c.GetString(middleware.ContextRoleKey),
        })
    })

    // ── Overview ──────────────────────────────────────────────────────────
    rg.GET("/overview", func(c *gin.Context) {
        overview, err := overviewSvc.GetOverview(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, overview)
    })

    // ── Users ─────────────────────────────────────────────────────────────
    rg.GET("/users", func(c *gin.Context) {
        var q dto.ListUsersQuery
        if err := c.ShouldBindQuery(&q); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        result, err := userSvc.List(c.Request.Context(), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, result)
    })

    rg.GET("/users/:id", func(c *gin.Context) {
        id, err := strconv.ParseInt(c.Param("id"), 10, 64)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"}); return }
        user, err := userSvc.GetByID(c.Request.Context(), id)
        if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, user)
    })

    rg.POST("/users", func(c *gin.Context) {
        var req dto.CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        user, err := userSvc.Create(c.Request.Context(), req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID"))
        if err != nil { c.JSON(http.StatusConflict, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusCreated, user)
    })

    rg.PUT("/users/:id", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        var req dto.UpdateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        user, err := userSvc.Update(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID"))
        if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, user)
    })

    rg.PUT("/users/:id/suspend", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := userSvc.Suspend(c.Request.Context(), id, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "user suspended"})
    })

    rg.PUT("/users/:id/activate", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := userSvc.Activate(c.Request.Context(), id, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "user activated"})
    })

    rg.DELETE("/users/:id", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := userSvc.Delete(c.Request.Context(), id, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
    })

    // ── Wells ─────────────────────────────────────────────────────────────
    rg.GET("/wells", func(c *gin.Context) {
        var q dto.ListWellsQuery
        c.ShouldBindQuery(&q)
        wells, total, err := wellRepo.List(c.Request.Context(), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        pages := int(math.Ceil(float64(total) / float64(q.Limit)))
        c.JSON(http.StatusOK, dto.ListWellsResponse{
            Data: wells,
            Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
        })
    })

    rg.POST("/wells", func(c *gin.Context) {
        var req dto.CreateWellRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        well, err := wellRepo.Create(c.Request.Context(), req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "CREATE_WELL", "wells",
            well.ID, map[string]interface{}{"name": well.Name, "district": well.District},
            c.ClientIP(), c.GetHeader("X-Request-ID"))
        c.JSON(http.StatusCreated, well)
    })

    // ── Settings ──────────────────────────────────────────────────────────
    rg.GET("/settings", func(c *gin.Context) {
        settings, err := settingsSvc.GetAll(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": settings})
    })

    rg.PUT("/settings", func(c *gin.Context) {
        var req dto.UpdateSettingsRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := settingsSvc.Update(c.Request.Context(), req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
    })

    // ── ML Models ─────────────────────────────────────────────────────────
    rg.GET("/models", func(c *gin.Context) {
        models, err := modelRepo.ListModels(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": models})
    })

    // ── Data Sources ──────────────────────────────────────────────────────
    rg.GET("/data-sources", func(c *gin.Context) {
        ds, err := modelRepo.ListDataSources(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": ds})
    })

    // ── Audit Log ─────────────────────────────────────────────────────────
    rg.GET("/activity-log", func(c *gin.Context) {
        var q dto.AuditLogQuery
        c.ShouldBindQuery(&q)
        entries, total, err := auditRepo.List(c.Request.Context(), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        pages := int(math.Ceil(float64(total) / float64(q.Limit)))
        c.JSON(http.StatusOK, dto.AuditLogResponse{
            Data: entries,
            Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
        })
    })
}
```

---

## Step 5 — Wire `db` into `RegisterRoutes` in the router

Because admin `RegisterRoutes` now needs the DB pool, update the router call.

**In `internal/handler/router.go`**, change:
```go
// Before (admin package import usually aliased as adminHandler)
adminHandler.RegisterRoutes(adminGroup)

// After
adminHandler.RegisterRoutes(adminGroup, db)
```

Update shared router signature to accept `db *pgxpool.Pool`:
```go
func RegisterRoutes(r *gin.Engine, authHandler *AuthHandler, jwtSecret string, db *pgxpool.Pool) {
```

Then update `cmd/server/main.go` to pass `dbPool` as the fourth argument:
```go
handler.RegisterRoutes(r, authHandler, cfg.Auth.JWTSecret, dbPool)
```

Also ensure imports in `internal/handler/router.go` include:

```go
import (
        adminHandler "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/handler"
        "github.com/jackc/pgx/v5/pgxpool"
)
```

---

## Step 6 — Build & Verify

```powershell
cd backend

# Build check (no test DB needed)
go build ./...

# Optional: run tests if/when test files exist
go test ./...

# If using Docker dependencies
docker compose --env-file .env up -d postgres redis

# OR if using local services, verify listeners first
Get-NetTCPConnection -LocalPort 5432 -State Listen
Get-NetTCPConnection -LocalPort 6379 -State Listen

# Run with live reload
air
```

Notes:

- Run `air` from `backend` (not repo root), because `go.mod` is in `backend`.
- For host-run backend with local Postgres service, use `POSTGRES_PORT=5432` in `backend/.env`.
- Use PostgreSQL port `5432` consistently for both local and Docker-based development in this project.

---

## Step 7 — Smoke Test (PowerShell)

```powershell
# Login
$loginBody = @{ email = "admin@aquavidarbha.in"; password = "Admin@12345" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# Overview
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/v1/admin/overview" -Headers $headers

# List users
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/v1/admin/users?limit=5" -Headers $headers

# Create a gov officer
$createUserBody = @{
    email = "officer@aq.in"
    password = "Gov@12345"
    name = "Priya Officer"
    role = "gov"
    district = "Nagpur"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/admin/users" -Headers $headers -ContentType "application/json" -Body $createUserBody

# Settings
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/v1/admin/settings" -Headers $headers

# Activity log
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/v1/admin/activity-log" -Headers $headers
```

If login fails with seeded admin credentials, verify seeded admin password hash in `schema.sql` is replaced with a real bcrypt hash.

---

## Complete API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/me` | Caller's profile from JWT |
| GET | `/api/v1/admin/overview` | KPI stats (user counts, wells, complaints) |
| GET | `/api/v1/admin/users` | List users — `?role=gov&district=Nagpur&search=priya&active=true&page=1&limit=20` |
| GET | `/api/v1/admin/users/:id` | Single user by ID |
| POST | `/api/v1/admin/users` | Create citizen / gov / admin user |
| PUT | `/api/v1/admin/users/:id` | Update user name/district/phone/role |
| PUT | `/api/v1/admin/users/:id/suspend` | Deactivate user |
| PUT | `/api/v1/admin/users/:id/activate` | Re-activate user |
| DELETE | `/api/v1/admin/users/:id` | Delete user (cannot delete self) |
| GET | `/api/v1/admin/wells` | List wells — `?district=Nagpur&active=true` |
| POST | `/api/v1/admin/wells` | Create well |
| GET | `/api/v1/admin/settings` | Read all system settings |
| PUT | `/api/v1/admin/settings` | Bulk update settings |
| GET | `/api/v1/admin/models` | List ML model registry |
| GET | `/api/v1/admin/data-sources` | List data source catalog |
| GET | `/api/v1/admin/activity-log` | Full audit log — `?action=SUSPEND_USER&page=1` |

---

## Definition of Done

- [ ] `go build ./...` passes
- [ ] `go test ./...` passes (where tests exist)
- [ ] All 16 endpoints return correct HTTP status codes
- [ ] Every write endpoint creates a row in `audit_log`
- [ ] Cannot suspend or delete own account
- [ ] Pagination works on list endpoints
- [ ] Gov officer account creation is functional (needed by Gov dashboard)
- [ ] Redis cache enabled for overview (and at least one list endpoint)
- [ ] Cache invalidation implemented on user/settings write operations
- [ ] Router/main dependency wiring updated for DB (and Redis if used)
- [ ] Basic operational logs show endpoint, latency, and cache hit/miss behavior
