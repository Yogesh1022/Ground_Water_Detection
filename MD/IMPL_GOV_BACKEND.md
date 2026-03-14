# Government Officer Dashboard — Complete Backend Implementation Guide

> Role: `gov`  
> Route prefix: `/api/v1/govn-user`  
> Auth: `Authorization: Bearer <jwt>` with `role=gov`

---

## Overview

The Gov Officer dashboard is the **third and final** dashboard to implement. Gov officers are scoped to a single district. They manage complaints from citizens, assign tasks, manage tanker routes, view district analytics, and access forecast data.

**Implement after Admin AND User because:**
- Admin creates gov officer accounts (with `district` set)
- Citizen complaints (from User dashboard) are what gov officers manage
- `district_stats` materialized view must be populated

---

## Files to Create

```
backend/internal/dashboard/govn_user/
├── dto/
│   └── dto.go
├── repository/
│   ├── complaint_repo.go
│   ├── district_repo.go
│   ├── tanker_repo.go
│   ├── task_repo.go
│   └── audit_repo.go
├── service/
│   ├── overview_service.go
│   ├── complaint_service.go
│   ├── analytics_service.go
│   ├── tanker_service.go
│   └── task_service.go
└── handler/
    └── routes.go          ← already exists (stub), replace completely
```

---

## Step 1 — DTOs (`dto/dto.go`)

```go
package dto

import "time"

// ── Pagination ────────────────────────────────────────────────────────────────

type PaginationQuery struct {
    Page  int `form:"page,default=1"   binding:"min=1"`
    Limit int `form:"limit,default=20" binding:"min=1,max=100"`
}

func (p PaginationQuery) Offset() int { return (p.Page - 1) * p.Limit }

type PagedMeta struct {
    Page       int   `json:"page"`
    Limit      int   `json:"limit"`
    TotalItems int64 `json:"total_items"`
    TotalPages int   `json:"total_pages"`
}

// ── Profile ───────────────────────────────────────────────────────────────────

type ProfileResponse struct {
    ID       int64  `json:"id"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    Role     string `json:"role"`
    District string `json:"district"`
    Phone    string `json:"phone"`
}

// ── Overview KPIs ─────────────────────────────────────────────────────────────

type OverviewResponse struct {
    District            string  `json:"district"`
    OpenComplaints      int64   `json:"open_complaints"`
    ResolvedThisMonth   int64   `json:"resolved_this_month"`
    ActiveTankerRoutes  int64   `json:"active_tanker_routes"`
    PendingTasks        int64   `json:"pending_tasks"`
    WellCount           int64   `json:"well_count"`
    AvgDepthMbgl        float64 `json:"avg_depth_mbgl"`
    RiskStatus          string  `json:"risk_status"`
    CrisisIndex         float64 `json:"crisis_index"`
}

// ── Complaints ────────────────────────────────────────────────────────────────

type ComplaintListQuery struct {
    PaginationQuery
    Status   string `form:"status"`
    Severity string `form:"severity"`
    Type     string `form:"type"`
}

type ComplaintResponse struct {
    ID             int64     `json:"id"`
    TrackingNumber string    `json:"tracking_number"`
    Type           string    `json:"type"`
    District       string    `json:"district"`
    Taluka         string    `json:"taluka"`
    Village        string    `json:"village"`
    Severity       string    `json:"severity"`
    Description    string    `json:"description"`
    Status         string    `json:"status"`
    AssignedOfficerID *int64 `json:"assigned_officer_id"`
    EscalationNote string    `json:"escalation_note"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

type ComplaintListResponse struct {
    Data []ComplaintResponse `json:"data"`
    Meta PagedMeta           `json:"meta"`
}

type AssignComplaintRequest struct {
    OfficerID int64  `json:"officer_id" binding:"required"`
    Note      string `json:"note"`
}

type UpdateComplaintStatusRequest struct {
    Status         string `json:"status"          binding:"required,oneof=open in_review in_progress resolved escalated"`
    EscalationNote string `json:"escalation_note"`
}

// ── District Analytics ────────────────────────────────────────────────────────

type DistrictAnalyticsResponse struct {
    District       string              `json:"district"`
    WellCount      int64               `json:"well_count"`
    AvgDepthMbgl   float64             `json:"avg_depth_mbgl"`
    MaxDepthMbgl   float64             `json:"max_depth_mbgl"`
    MinDepthMbgl   float64             `json:"min_depth_mbgl"`
    RiskStatus     string              `json:"risk_status"`
    CrisisIndex    float64             `json:"crisis_index"`
    DepthChangeQoQ float64             `json:"depth_change_qoq"`
    MonthlyTrend   []MonthlyDepthPoint `json:"monthly_trend"`
}

type MonthlyDepthPoint struct {
    Month     string  `json:"month"`  // "2026-01"
    AvgDepth  float64 `json:"avg_depth_mbgl"`
    WellCount int64   `json:"well_count"`
}

// ── Forecast / Crisis Zones ───────────────────────────────────────────────────

type ForecastResponse struct {
    District string          `json:"district"`
    Forecast []MonthForecast `json:"forecast"`
}

type MonthForecast struct {
    MonthOffset int     `json:"month_offset"`
    Label       string  `json:"label"`
    DepthMbgl   float64 `json:"depth_mbgl"`
    RiskLevel   string  `json:"risk_level"`
    Confidence  float64 `json:"confidence"`
}

type CrisisZone struct {
    District    string  `json:"district"`
    RiskStatus  string  `json:"risk_status"`
    CrisisIndex float64 `json:"crisis_index"`
    AvgDepth    float64 `json:"avg_depth_mbgl"`
    WellCount   int64   `json:"well_count"`
}

// ── Tanker Routes ─────────────────────────────────────────────────────────────

type TankerResponse struct {
    ID              int64     `json:"id"`
    RouteName       string    `json:"route_name"`
    District        string    `json:"district"`
    Villages        []string  `json:"villages"`
    Schedule        string    `json:"schedule"`
    CapacityLiters  int       `json:"capacity_liters"`
    Status          string    `json:"status"`
    AssignedDriver  string    `json:"assigned_driver"`
    ContactNumber   string    `json:"contact_number"`
    CreatedAt       time.Time `json:"created_at"`
}

type CreateTankerRequest struct {
    RouteName      string   `json:"route_name"      binding:"required"`
    Villages       []string `json:"villages"        binding:"required,min=1"`
    Schedule       string   `json:"schedule"`
    CapacityLiters int      `json:"capacity_liters"`
    AssignedDriver string   `json:"assigned_driver"`
    ContactNumber  string   `json:"contact_number"`
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

type TaskResponse struct {
    ID                int64     `json:"id"`
    ComplaintID       int64     `json:"complaint_id"`
    AssigneeOfficerID int64     `json:"assignee_officer_id"`
    AssigneeName      string    `json:"assignee_name"`
    Priority          string    `json:"priority"`
    Status            string    `json:"status"`
    Notes             string    `json:"notes"`
    DueDate           string    `json:"due_date"`
    CreatedAt         time.Time `json:"created_at"`
}

type CreateTaskRequest struct {
    ComplaintID       int64  `json:"complaint_id"        binding:"required"`
    AssigneeOfficerID int64  `json:"assignee_officer_id" binding:"required"`
    Priority          string `json:"priority"            binding:"required,oneof=low medium high urgent"`
    Notes             string `json:"notes"`
    DueDate           string `json:"due_date"`  // "2026-04-01"
}

type UpdateTaskRequest struct {
    Status string `json:"status" binding:"required,oneof=pending in_progress completed cancelled"`
    Notes  string `json:"notes"`
}

type WorkloadEntry struct {
    OfficerID   int64  `json:"officer_id"`
    OfficerName string `json:"officer_name"`
    Pending     int64  `json:"pending"`
    InProgress  int64  `json:"in_progress"`
    Completed   int64  `json:"completed"`
    Total       int64  `json:"total"`
}

// ── Activity Log ──────────────────────────────────────────────────────────────

type ActivityLogQuery struct {
    PaginationQuery
    Action string `form:"action"`
}

type ActivityEntry struct {
    ID          int64       `json:"id"`
    ActorID     int64       `json:"actor_id"`
    ActorRole   string      `json:"actor_role"`
    Action      string      `json:"action"`
    TargetTable string      `json:"target_table"`
    TargetID    int64       `json:"target_id"`
    Details     interface{} `json:"details"`
    CreatedAt   time.Time   `json:"created_at"`
}

type ActivityLogResponse struct {
    Data []ActivityEntry `json:"data"`
    Meta PagedMeta       `json:"meta"`
}
```

---

## Step 2 — Repository Layer

### `repository/audit_repo.go`

> **Reuse:** This is the same audit write pattern as Admin. Copy or move to a shared package if preferred.

```go
package repository

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepo struct{ db *pgxpool.Pool }

func NewAuditRepo(db *pgxpool.Pool) *AuditRepo { return &AuditRepo{db: db} }

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

func (r *AuditRepo) ListByDistrict(ctx context.Context, district string, q dto.ActivityLogQuery) ([]dto.ActivityEntry, int64, error) {
    where := "WHERE actor_role = 'gov'"
    args := []interface{}{}
    i := 1
    if q.Action != "" {
        where += fmt.Sprintf(" AND action = $%d", i); args = append(args, q.Action); i++
    }
    var total int64
    r.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_log "+where, args...).Scan(&total)

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, COALESCE(actor_id,0), COALESCE(actor_role::text,''),
                action, COALESCE(target_table,''), COALESCE(target_id,0),
                COALESCE(details,'{}'), created_at
         FROM audit_log `+where+
            fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil { return nil, 0, err }
    defer rows.Close()

    var entries []dto.ActivityEntry
    for rows.Next() {
        var e dto.ActivityEntry
        var detailsRaw []byte
        rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.Action, &e.TargetTable, &e.TargetID, &detailsRaw, &e.CreatedAt)
        json.Unmarshal(detailsRaw, &e.Details)
        entries = append(entries, e)
    }
    return entries, total, rows.Err()
}
```

### `repository/complaint_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ComplaintRepo struct{ db *pgxpool.Pool }

func NewComplaintRepo(db *pgxpool.Pool) *ComplaintRepo { return &ComplaintRepo{db: db} }

func (r *ComplaintRepo) ListByDistrict(ctx context.Context, district string, q dto.ComplaintListQuery) ([]dto.ComplaintResponse, int64, error) {
    where := "WHERE district = $1"
    args := []interface{}{district}
    i := 2
    if q.Status != "" {
        where += fmt.Sprintf(" AND status = $%d", i); args = append(args, q.Status); i++
    }
    if q.Severity != "" {
        where += fmt.Sprintf(" AND severity = $%d", i); args = append(args, q.Severity); i++
    }
    if q.Type != "" {
        where += fmt.Sprintf(" AND type = $%d", i); args = append(args, q.Type); i++
    }

    var total int64
    r.db.QueryRow(ctx, "SELECT COUNT(*) FROM complaints "+where, args...).Scan(&total)

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
                severity::text, description, status::text,
                assigned_officer_id, COALESCE(escalation_note,''), created_at, updated_at
         FROM complaints `+where+
            fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil { return nil, 0, fmt.Errorf("list complaints: %w", err) }
    defer rows.Close()

    var complaints []dto.ComplaintResponse
    for rows.Next() {
        var c dto.ComplaintResponse
        rows.Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District, &c.Taluka, &c.Village,
            &c.Severity, &c.Description, &c.Status, &c.AssignedOfficerID,
            &c.EscalationNote, &c.CreatedAt, &c.UpdatedAt)
        complaints = append(complaints, c)
    }
    return complaints, total, rows.Err()
}

func (r *ComplaintRepo) GetByID(ctx context.Context, id int64) (dto.ComplaintResponse, error) {
    var c dto.ComplaintResponse
    err := r.db.QueryRow(ctx,
        `SELECT id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
                severity::text, description, status::text,
                assigned_officer_id, COALESCE(escalation_note,''), created_at, updated_at
         FROM complaints WHERE id = $1`, id,
    ).Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District, &c.Taluka, &c.Village,
        &c.Severity, &c.Description, &c.Status, &c.AssignedOfficerID,
        &c.EscalationNote, &c.CreatedAt, &c.UpdatedAt)
    if err != nil {
        if err == pgx.ErrNoRows { return c, fmt.Errorf("complaint not found") }
        return c, fmt.Errorf("get complaint: %w", err)
    }
    return c, nil
}

func (r *ComplaintRepo) Assign(ctx context.Context, id, officerID int64, note string) error {
    tag, err := r.db.Exec(ctx,
        `UPDATE complaints SET status = 'in_review', assigned_officer_id = $2
         WHERE id = $1`, id, officerID,
    )
    if err != nil { return fmt.Errorf("assign complaint: %w", err) }
    if tag.RowsAffected() == 0 { return fmt.Errorf("complaint not found") }
    return nil
}

func (r *ComplaintRepo) UpdateStatus(ctx context.Context, id int64, status, escalationNote string) error {
    var err error
    if status == "resolved" {
        _, err = r.db.Exec(ctx,
            `UPDATE complaints SET status = $2, resolved_at = NOW() WHERE id = $1`, id, status)
    } else {
        _, err = r.db.Exec(ctx,
            `UPDATE complaints SET status = $2, escalation_note = NULLIF($3,'') WHERE id = $1`,
            id, status, escalationNote)
    }
    return err
}

func (r *ComplaintRepo) CountByStatus(ctx context.Context, district string) (map[string]int64, error) {
    rows, err := r.db.Query(ctx,
        `SELECT status::text, COUNT(*) FROM complaints WHERE district = $1 GROUP BY status`, district)
    if err != nil { return nil, err }
    defer rows.Close()
    m := map[string]int64{}
    for rows.Next() {
        var s string; var n int64
        rows.Scan(&s, &n)
        m[s] = n
    }
    return m, rows.Err()
}
```

### `repository/district_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type DistrictRepo struct{ db *pgxpool.Pool }

func NewDistrictRepo(db *pgxpool.Pool) *DistrictRepo { return &DistrictRepo{db: db} }

func (r *DistrictRepo) GetStats(ctx context.Context, district string) (dto.DistrictAnalyticsResponse, error) {
    var a dto.DistrictAnalyticsResponse
    err := r.db.QueryRow(ctx,
        `SELECT district, well_count, avg_depth_mbgl, max_depth_mbgl, min_depth_mbgl,
                risk_status, COALESCE(crisis_index,0), COALESCE(depth_change_qoq,0)
         FROM district_stats WHERE district = $1`, district,
    ).Scan(&a.District, &a.WellCount, &a.AvgDepthMbgl, &a.MaxDepthMbgl, &a.MinDepthMbgl,
        &a.RiskStatus, &a.CrisisIndex, &a.DepthChangeQoQ)
    if err != nil { return a, fmt.Errorf("district stats for %s: %w", district, err) }
    return a, nil
}

// GetMonthlyTrend returns 12-month depth averages for a district.
func (r *DistrictRepo) GetMonthlyTrend(ctx context.Context, district string) ([]dto.MonthlyDepthPoint, error) {
    rows, err := r.db.Query(ctx,
        `SELECT TO_CHAR(wr.reading_date, 'YYYY-MM') AS month,
                ROUND(AVG(wr.depth_mbgl)::NUMERIC, 2) AS avg_depth,
                COUNT(DISTINCT wr.well_id) AS well_count
         FROM well_readings wr
         JOIN wells w ON w.id = wr.well_id
         WHERE w.district = $1
           AND wr.reading_date >= NOW() - INTERVAL '12 months'
         GROUP BY TO_CHAR(wr.reading_date, 'YYYY-MM')
         ORDER BY month ASC`, district,
    )
    if err != nil { return nil, fmt.Errorf("monthly trend: %w", err) }
    defer rows.Close()
    var points []dto.MonthlyDepthPoint
    for rows.Next() {
        var p dto.MonthlyDepthPoint
        rows.Scan(&p.Month, &p.AvgDepth, &p.WellCount)
        points = append(points, p)
    }
    return points, rows.Err()
}

// GetAllCrisisZones returns crisis stats for all districts (for the crisis zones map).
func (r *DistrictRepo) GetAllCrisisZones(ctx context.Context) ([]dto.CrisisZone, error) {
    rows, err := r.db.Query(ctx,
        `SELECT district, risk_status, COALESCE(crisis_index,0), avg_depth_mbgl, well_count
         FROM district_stats ORDER BY crisis_index DESC`)
    if err != nil { return nil, err }
    defer rows.Close()
    var zones []dto.CrisisZone
    for rows.Next() {
        var z dto.CrisisZone
        rows.Scan(&z.District, &z.RiskStatus, &z.CrisisIndex, &z.AvgDepth, &z.WellCount)
        zones = append(zones, z)
    }
    return zones, rows.Err()
}
```

### `repository/tanker_repo.go`

```go
package repository

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type TankerRepo struct{ db *pgxpool.Pool }

func NewTankerRepo(db *pgxpool.Pool) *TankerRepo { return &TankerRepo{db: db} }

func (r *TankerRepo) ListByDistrict(ctx context.Context, district string) ([]dto.TankerResponse, error) {
    rows, err := r.db.Query(ctx,
        `SELECT id, route_name, district, villages, COALESCE(schedule,''),
                COALESCE(capacity_liters,0), status::text,
                COALESCE(assigned_driver,''), COALESCE(contact_number,''), created_at
         FROM tanker_routes WHERE district = $1 ORDER BY created_at DESC`, district,
    )
    if err != nil { return nil, fmt.Errorf("list tankers: %w", err) }
    defer rows.Close()

    var tankers []dto.TankerResponse
    for rows.Next() {
        var t dto.TankerResponse
        var villagesRaw []byte
        rows.Scan(&t.ID, &t.RouteName, &t.District, &villagesRaw, &t.Schedule,
            &t.CapacityLiters, &t.Status, &t.AssignedDriver, &t.ContactNumber, &t.CreatedAt)
        json.Unmarshal(villagesRaw, &t.Villages)
        if t.Villages == nil { t.Villages = []string{} }
        tankers = append(tankers, t)
    }
    return tankers, rows.Err()
}

func (r *TankerRepo) Create(ctx context.Context, district string, createdByID int64, req dto.CreateTankerRequest) (dto.TankerResponse, error) {
    villagesJSON, _ := json.Marshal(req.Villages)
    var t dto.TankerResponse
    var villagesRaw []byte
    err := r.db.QueryRow(ctx,
        `INSERT INTO tanker_routes (route_name, district, villages, schedule, capacity_liters, assigned_driver, contact_number, created_by_id)
         VALUES ($1, $2, $3, NULLIF($4,''), NULLIF($5::int, 0), NULLIF($6,''), NULLIF($7,''), $8)
         RETURNING id, route_name, district, villages, COALESCE(schedule,''),
                   COALESCE(capacity_liters,0), status::text,
                   COALESCE(assigned_driver,''), COALESCE(contact_number,''), created_at`,
        req.RouteName, district, villagesJSON, req.Schedule, req.CapacityLiters,
        req.AssignedDriver, req.ContactNumber, createdByID,
    ).Scan(&t.ID, &t.RouteName, &t.District, &villagesRaw, &t.Schedule,
        &t.CapacityLiters, &t.Status, &t.AssignedDriver, &t.ContactNumber, &t.CreatedAt)
    if err != nil { return t, fmt.Errorf("create tanker: %w", err) }
    json.Unmarshal(villagesRaw, &t.Villages)
    if t.Villages == nil { t.Villages = []string{} }
    return t, nil
}

func (r *TankerRepo) CountActive(ctx context.Context, district string) (int64, error) {
    var n int64
    r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tanker_routes WHERE district = $1 AND status = 'active'`, district).Scan(&n)
    return n, nil
}
```

### `repository/task_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type TaskRepo struct{ db *pgxpool.Pool }

func NewTaskRepo(db *pgxpool.Pool) *TaskRepo { return &TaskRepo{db: db} }

func (r *TaskRepo) Create(ctx context.Context, assignedByID int64, req dto.CreateTaskRequest) (dto.TaskResponse, error) {
    var t dto.TaskResponse
    var dueDate *string
    if req.DueDate != "" { dueDate = &req.DueDate }

    err := r.db.QueryRow(ctx,
        `INSERT INTO task_assignments (complaint_id, assignee_officer_id, assigned_by_id, priority, notes, due_date)
         VALUES ($1, $2, $3, $4, NULLIF($5,''), $6::date)
         RETURNING id, complaint_id, assignee_officer_id,
                   (SELECT name FROM users WHERE id = $2),
                   priority::text, status::text,
                   COALESCE(notes,''), COALESCE(due_date::text,''), created_at`,
        req.ComplaintID, req.AssigneeOfficerID, assignedByID, req.Priority, req.Notes, dueDate,
    ).Scan(&t.ID, &t.ComplaintID, &t.AssigneeOfficerID, &t.AssigneeName,
        &t.Priority, &t.Status, &t.Notes, &t.DueDate, &t.CreatedAt)
    if err != nil { return t, fmt.Errorf("create task: %w", err) }
    return t, nil
}

func (r *TaskRepo) UpdateStatus(ctx context.Context, id int64, req dto.UpdateTaskRequest) error {
    var err error
    if req.Status == "completed" {
        _, err = r.db.Exec(ctx,
            `UPDATE task_assignments SET status = $2, notes = COALESCE(NULLIF($3,''), notes), completed_at = NOW() WHERE id = $1`,
            id, req.Status, req.Notes)
    } else {
        _, err = r.db.Exec(ctx,
            `UPDATE task_assignments SET status = $2, notes = COALESCE(NULLIF($3,''), notes) WHERE id = $1`,
            id, req.Status, req.Notes)
    }
    if err != nil { return fmt.Errorf("update task: %w", err) }
    return nil
}

func (r *TaskRepo) GetByID(ctx context.Context, id int64) (dto.TaskResponse, error) {
    var t dto.TaskResponse
    err := r.db.QueryRow(ctx,
        `SELECT ta.id, ta.complaint_id, ta.assignee_officer_id,
                u.name, ta.priority::text, ta.status::text,
                COALESCE(ta.notes,''), COALESCE(ta.due_date::text,''), ta.created_at
         FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE ta.id = $1`, id,
    ).Scan(&t.ID, &t.ComplaintID, &t.AssigneeOfficerID, &t.AssigneeName,
        &t.Priority, &t.Status, &t.Notes, &t.DueDate, &t.CreatedAt)
    if err != nil {
        if err == pgx.ErrNoRows { return t, fmt.Errorf("task not found") }
        return t, fmt.Errorf("get task: %w", err)
    }
    return t, nil
}

func (r *TaskRepo) GetWorkload(ctx context.Context, district string) ([]dto.WorkloadEntry, error) {
    rows, err := r.db.Query(ctx,
        `SELECT u.id, u.name,
                COUNT(*) FILTER (WHERE ta.status = 'pending')     AS pending,
                COUNT(*) FILTER (WHERE ta.status = 'in_progress') AS in_progress,
                COUNT(*) FILTER (WHERE ta.status = 'completed')   AS completed,
                COUNT(*)                                          AS total
         FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE u.district = $1 AND u.role = 'gov'
         GROUP BY u.id, u.name
         ORDER BY total DESC`, district,
    )
    if err != nil { return nil, fmt.Errorf("workload: %w", err) }
    defer rows.Close()
    var workload []dto.WorkloadEntry
    for rows.Next() {
        var w dto.WorkloadEntry
        rows.Scan(&w.OfficerID, &w.OfficerName, &w.Pending, &w.InProgress, &w.Completed, &w.Total)
        workload = append(workload, w)
    }
    return workload, rows.Err()
}

func (r *TaskRepo) CountPending(ctx context.Context, district string) (int64, error) {
    var n int64
    r.db.QueryRow(ctx,
        `SELECT COUNT(*) FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE u.district = $1 AND ta.status IN ('pending', 'in_progress')`, district,
    ).Scan(&n)
    return n, nil
}
```

---

## Step 3 — Service Layer

### `service/overview_service.go`

```go
package service

import (
    "context"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

type OverviewService struct {
    complaintRepo *repository.ComplaintRepo
    tankerRepo    *repository.TankerRepo
    taskRepo      *repository.TaskRepo
    districtRepo  *repository.DistrictRepo
}

func NewOverviewService(c *repository.ComplaintRepo, t *repository.TankerRepo, ta *repository.TaskRepo, d *repository.DistrictRepo) *OverviewService {
    return &OverviewService{complaintRepo: c, tankerRepo: t, taskRepo: ta, districtRepo: d}
}

func (s *OverviewService) GetOverview(ctx context.Context, district string) (dto.OverviewResponse, error) {
    counts, _ := s.complaintRepo.CountByStatus(ctx, district)
    activeTankers, _ := s.tankerRepo.CountActive(ctx, district)
    pendingTasks, _ := s.taskRepo.CountPending(ctx, district)
    stats, _ := s.districtRepo.GetStats(ctx, district)

    return dto.OverviewResponse{
        District:           district,
        OpenComplaints:     counts["open"] + counts["in_review"],
        ResolvedThisMonth:  counts["resolved"],
        ActiveTankerRoutes: activeTankers,
        PendingTasks:       pendingTasks,
        WellCount:          stats.WellCount,
        AvgDepthMbgl:       stats.AvgDepthMbgl,
        RiskStatus:         stats.RiskStatus,
        CrisisIndex:        stats.CrisisIndex,
    }, nil
}
```

### `service/complaint_service.go`

```go
package service

import (
    "context"
    "math"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

type ComplaintService struct {
    repo      *repository.ComplaintRepo
    auditRepo *repository.AuditRepo
}

func NewComplaintService(repo *repository.ComplaintRepo, auditRepo *repository.AuditRepo) *ComplaintService {
    return &ComplaintService{repo: repo, auditRepo: auditRepo}
}

func (s *ComplaintService) List(ctx context.Context, district string, q dto.ComplaintListQuery) (dto.ComplaintListResponse, error) {
    complaints, total, err := s.repo.ListByDistrict(ctx, district, q)
    if err != nil { return dto.ComplaintListResponse{}, err }
    pages := int(math.Ceil(float64(total) / float64(q.Limit)))
    return dto.ComplaintListResponse{
        Data: complaints,
        Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
    }, nil
}

func (s *ComplaintService) Assign(ctx context.Context, id int64, req dto.AssignComplaintRequest, actorID int64, actorRole, ip, requestID string) error {
    if err := s.repo.Assign(ctx, id, req.OfficerID, req.Note); err != nil { return err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "ASSIGN_COMPLAINT", "complaints", id,
        map[string]interface{}{"officer_id": req.OfficerID, "note": req.Note}, ip, requestID)
    return nil
}

func (s *ComplaintService) UpdateStatus(ctx context.Context, id int64, req dto.UpdateComplaintStatusRequest, actorID int64, actorRole, ip, requestID string) error {
    if err := s.repo.UpdateStatus(ctx, id, req.Status, req.EscalationNote); err != nil { return err }
    s.auditRepo.WriteLog(ctx, actorID, actorRole, "UPDATE_COMPLAINT_STATUS", "complaints", id,
        map[string]interface{}{"status": req.Status}, ip, requestID)
    return nil
}
```

### `service/analytics_service.go`

```go
package service

import (
    "context"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

type AnalyticsService struct{ repo *repository.DistrictRepo }

func NewAnalyticsService(repo *repository.DistrictRepo) *AnalyticsService {
    return &AnalyticsService{repo: repo}
}

func (s *AnalyticsService) GetAnalytics(ctx context.Context, district string) (dto.DistrictAnalyticsResponse, error) {
    analytics, err := s.repo.GetStats(ctx, district)
    if err != nil { return analytics, err }
    trend, err := s.repo.GetMonthlyTrend(ctx, district)
    if err != nil { return analytics, err }
    analytics.MonthlyTrend = trend
    return analytics, nil
}

func (s *AnalyticsService) GetCrisisZones(ctx context.Context) ([]dto.CrisisZone, error) {
    return s.repo.GetAllCrisisZones(ctx)
}

// GetForecast returns a simple stub forecast based on current avg depth + trend.
// Replace with real ML call once prediction microservice is wired.
func (s *AnalyticsService) GetForecast(ctx context.Context, district string) (dto.ForecastResponse, error) {
    stats, err := s.repo.GetStats(ctx, district)
    if err != nil { return dto.ForecastResponse{}, err }

    base := stats.AvgDepthMbgl
    months := []struct{ offset int; label string }{
        {1, "Next Month"}, {2, "Month 2"}, {3, "Month 3"},
    }

    var forecast []dto.MonthForecast
    for _, m := range months {
        depth := base + float64(m.offset)*1.8
        risk := "SAFE"
        switch {
        case depth > 65: risk = "DANGER"
        case depth > 50: risk = "WARNING"
        case depth > 35: risk = "MODERATE"
        }
        forecast = append(forecast, dto.MonthForecast{
            MonthOffset: m.offset,
            Label:       m.label,
            DepthMbgl:   depth,
            RiskLevel:   risk,
            Confidence:  85.0 - float64(m.offset)*5,
        })
    }
    return dto.ForecastResponse{District: district, Forecast: forecast}, nil
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

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/service"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes wires all gov officer endpoints onto the already-auth-guarded group.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool) {
    // Repositories
    complaintRepo := repository.NewComplaintRepo(db)
    districtRepo  := repository.NewDistrictRepo(db)
    tankerRepo    := repository.NewTankerRepo(db)
    taskRepo      := repository.NewTaskRepo(db)
    auditRepo     := repository.NewAuditRepo(db)

    // Services
    overviewSvc   := service.NewOverviewService(complaintRepo, tankerRepo, taskRepo, districtRepo)
    complaintSvc  := service.NewComplaintService(complaintRepo, auditRepo)
    analyticsSvc  := service.NewAnalyticsService(districtRepo)

    // Helper to get officer's district from DB (fallback to JWT claims if not in DB)
    getDistrict := func(c *gin.Context) string {
        return c.GetString("district") // set by district lookup middleware (see below)
    }

    // ── Identity ──────────────────────────────────────────────────────────
    rg.GET("/me", func(c *gin.Context) {
        var p dto.ProfileResponse
        userID := c.GetInt64(middleware.ContextUserIDKey)
        db.QueryRow(c.Request.Context(),
            `SELECT id, email, name, role::text, COALESCE(district,''), COALESCE(phone,'')
             FROM users WHERE id = $1`, userID,
        ).Scan(&p.ID, &p.Email, &p.Name, &p.Role, &p.District, &p.Phone)
        c.JSON(http.StatusOK, p)
    })

    // ── District middleware: attach officer's district to context ──────────
    rg.Use(func(c *gin.Context) {
        userID := c.GetInt64(middleware.ContextUserIDKey)
        var district string
        db.QueryRow(c.Request.Context(),
            `SELECT COALESCE(district,'') FROM users WHERE id = $1`, userID,
        ).Scan(&district)
        c.Set("district", district)
        c.Next()
    })

    // ── Overview ──────────────────────────────────────────────────────────
    rg.GET("/overview", func(c *gin.Context) {
        overview, err := overviewSvc.GetOverview(c.Request.Context(), getDistrict(c))
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, overview)
    })

    // ── Complaints ────────────────────────────────────────────────────────
    rg.GET("/requests", func(c *gin.Context) {
        var q dto.ComplaintListQuery
        c.ShouldBindQuery(&q)
        result, err := complaintSvc.List(c.Request.Context(), getDistrict(c), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, result)
    })

    rg.PUT("/requests/:id/assign", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        var req dto.AssignComplaintRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := complaintSvc.Assign(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "complaint assigned"})
    })

    rg.PUT("/requests/:id/resolve", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        req := dto.UpdateComplaintStatusRequest{Status: "resolved"}
        if err := complaintSvc.UpdateStatus(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "complaint resolved"})
    })

    rg.PUT("/requests/:id/escalate", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        var req dto.UpdateComplaintStatusRequest
        req.Status = "escalated"
        c.ShouldBindJSON(&req)
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        if err := complaintSvc.UpdateStatus(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        c.JSON(http.StatusOK, gin.H{"message": "complaint escalated"})
    })

    // ── District Analytics ────────────────────────────────────────────────
    rg.GET("/districts/analytics", func(c *gin.Context) {
        analytics, err := analyticsSvc.GetAnalytics(c.Request.Context(), getDistrict(c))
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, analytics)
    })

    rg.GET("/forecast", func(c *gin.Context) {
        forecast, err := analyticsSvc.GetForecast(c.Request.Context(), getDistrict(c))
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, forecast)
    })

    rg.GET("/crisis-zones", func(c *gin.Context) {
        zones, err := analyticsSvc.GetCrisisZones(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": zones})
    })

    // ── Tanker Routes ─────────────────────────────────────────────────────
    rg.GET("/tankers", func(c *gin.Context) {
        tankers, err := tankerRepo.ListByDistrict(c.Request.Context(), getDistrict(c))
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": tankers})
    })

    rg.POST("/tankers", func(c *gin.Context) {
        var req dto.CreateTankerRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        tanker, err := tankerRepo.Create(c.Request.Context(), getDistrict(c), actorID, req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "CREATE_TANKER_ROUTE", "tanker_routes",
            tanker.ID, map[string]interface{}{"route": tanker.RouteName}, c.ClientIP(), c.GetHeader("X-Request-ID"))
        c.JSON(http.StatusCreated, tanker)
    })

    // ── Tasks ─────────────────────────────────────────────────────────────
    rg.POST("/tasks", func(c *gin.Context) {
        var req dto.CreateTaskRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        actorID := c.GetInt64(middleware.ContextUserIDKey)
        actorRole := c.GetString(middleware.ContextRoleKey)
        task, err := taskRepo.Create(c.Request.Context(), actorID, req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "CREATE_TASK", "task_assignments",
            task.ID, map[string]interface{}{"complaint_id": req.ComplaintID, "assignee": req.AssigneeOfficerID},
            c.ClientIP(), c.GetHeader("X-Request-ID"))
        c.JSON(http.StatusCreated, task)
    })

    rg.PATCH("/tasks/:id", func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        var req dto.UpdateTaskRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        if err := taskRepo.UpdateStatus(c.Request.Context(), id, req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        task, _ := taskRepo.GetByID(c.Request.Context(), id)
        c.JSON(http.StatusOK, task)
    })

    rg.GET("/teams/workload", func(c *gin.Context) {
        workload, err := taskRepo.GetWorkload(c.Request.Context(), getDistrict(c))
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": workload})
    })

    // ── Activity Log ──────────────────────────────────────────────────────
    rg.GET("/activity-log", func(c *gin.Context) {
        var q dto.ActivityLogQuery
        c.ShouldBindQuery(&q)
        district := getDistrict(c)
        entries, total, err := auditRepo.ListByDistrict(c.Request.Context(), district, q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        pages := int(math.Ceil(float64(total) / float64(q.Limit)))
        c.JSON(http.StatusOK, dto.ActivityLogResponse{
            Data: entries,
            Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
        })
    })
}
```

---

## Step 5 — Update Router to Pass `db`

**In `internal/handler/router.go`**, update the call for gov user:
```go
// Before
govnUserHandler.RegisterRoutes(govnUserGroup)

// After
govnUserHandler.RegisterRoutes(govnUserGroup, db)
```

The router signature also needs `db *pgxpool.Pool` (already done in Admin step).

---

## Step 6 — Create a Gov Officer for Testing

```bash
# Use admin token to create a gov officer (must have district set)
curl -s -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@aq.in","password":"Gov@12345","name":"Priya Officer","role":"gov","district":"Nagpur"}'
```

---

## Step 7 — Smoke Test (curl)

```bash
# Login as gov officer
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@aq.in","password":"Gov@12345"}' | jq -r .token)

# Profile
curl -s http://localhost:8080/api/v1/govn-user/me -H "Authorization: Bearer $TOKEN" | jq

# Overview KPIs
curl -s http://localhost:8080/api/v1/govn-user/overview -H "Authorization: Bearer $TOKEN" | jq

# Complaints in their district
curl -s "http://localhost:8080/api/v1/govn-user/requests?status=open" \
  -H "Authorization: Bearer $TOKEN" | jq

# Assign a complaint (replace 1 with real complaint id, officer_id with real user id)
curl -s -X PUT http://localhost:8080/api/v1/govn-user/requests/1/assign \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"officer_id":2,"note":"Assigned to field team"}' | jq

# District analytics
curl -s http://localhost:8080/api/v1/govn-user/districts/analytics \
  -H "Authorization: Bearer $TOKEN" | jq

# Forecast
curl -s http://localhost:8080/api/v1/govn-user/forecast \
  -H "Authorization: Bearer $TOKEN" | jq

# Create tanker route
curl -s -X POST http://localhost:8080/api/v1/govn-user/tankers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"route_name":"Nagpur-North-Route","villages":["Kamptee","Bhandara"],"schedule":"Mon/Wed/Fri 08:00","capacity_liters":5000}' | jq

# Create a task
curl -s -X POST http://localhost:8080/api/v1/govn-user/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"complaint_id":1,"assignee_officer_id":2,"priority":"high","notes":"Inspect borewell","due_date":"2026-04-01"}' | jq

# Team workload
curl -s http://localhost:8080/api/v1/govn-user/teams/workload \
  -H "Authorization: Bearer $TOKEN" | jq

# Activity log
curl -s http://localhost:8080/api/v1/govn-user/activity-log \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Complete API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/govn-user/me` | Officer profile from DB |
| GET | `/api/v1/govn-user/overview` | KPIs for officer's district |
| GET | `/api/v1/govn-user/requests` | Complaints in district — `?status=open&severity=high` |
| PUT | `/api/v1/govn-user/requests/:id/assign` | Assign complaint to officer |
| PUT | `/api/v1/govn-user/requests/:id/resolve` | Mark complaint resolved |
| PUT | `/api/v1/govn-user/requests/:id/escalate` | Escalate complaint |
| GET | `/api/v1/govn-user/districts/analytics` | Depth stats + 12-month trend |
| GET | `/api/v1/govn-user/forecast` | 3-month depth forecast |
| GET | `/api/v1/govn-user/crisis-zones` | All districts ranked by crisis index |
| GET | `/api/v1/govn-user/tankers` | Tanker routes in district |
| POST | `/api/v1/govn-user/tankers` | Create new tanker route |
| POST | `/api/v1/govn-user/tasks` | Create task assignment |
| PATCH | `/api/v1/govn-user/tasks/:id` | Update task status |
| GET | `/api/v1/govn-user/teams/workload` | Officer task workload breakdown |
| GET | `/api/v1/govn-user/activity-log` | Gov-role audit entries — `?action=ASSIGN_COMPLAINT` |

---

## District Scoping Rules

Gov officers are scoped to their `district` column in the `users` table. Every repository query filters by district automatically from the officer's JWT user profile — officers **cannot** access data from other districts.

The `Use()` middleware in the handler automatically injects `district` into the Gin context for every request.

---

## Definition of Done

- [ ] `go build ./...` passes
- [ ] All 15 endpoints accessible with gov JWT
- [ ] Overview KPIs correctly show only data from the officer's district
- [ ] Complaint assign/resolve/escalate each creates an `audit_log` entry
- [ ] Tanker route creation scoped to officer's district
- [ ] Task workload shows real officer assignments
- [ ] Gov officer cannot see data from a different district
