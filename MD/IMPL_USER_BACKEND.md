# Common User (Citizen) Dashboard — Complete Backend Implementation Guide

> Role: `citizen`  
> Route prefix: `/api/v1/common-user`  
> Auth: `Authorization: Bearer <jwt>` with `role=citizen`

---

## Overview

The citizen dashboard is the **public-facing layer**. Citizens can check groundwater levels, file complaints, track complaints, and view alerts. The most important endpoint is `POST /predict` which calls the Python ML engine.

**Implement after Admin** because:
- Admin must create well data first
- Admin must create `district_stats` (materialized view populated from wells)
- Admin's `audit_log` write pattern is reused here

---

## Files to Create

```
backend/internal/dashboard/common_user/
├── dto/
│   └── dto.go
├── repository/
│   ├── well_repo.go
│   ├── complaint_repo.go
│   ├── alert_repo.go
│   └── prediction_repo.go
├── service/
│   ├── profile_service.go
│   ├── well_service.go
│   ├── complaint_service.go
│   ├── alert_service.go
│   ├── district_service.go
│   └── predict_service.go
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

type UpdateProfileRequest struct {
    Name     string `json:"name"     binding:"omitempty,min=2"`
    District string `json:"district"`
    Phone    string `json:"phone"`
}

// ── Wells ─────────────────────────────────────────────────────────────────────

type WellListQuery struct {
    PaginationQuery
    District string `form:"district"`
}

type WellResponse struct {
    ID               int64   `json:"id"`
    Name             string  `json:"name"`
    District         string  `json:"district"`
    Taluka           string  `json:"taluka"`
    Village          string  `json:"village"`
    Latitude         float64 `json:"latitude"`
    Longitude        float64 `json:"longitude"`
    WellType         string  `json:"well_type"`
    DepthTotalM      float64 `json:"depth_total_m"`
    AffectedFamilies int     `json:"affected_families"`
}

type WellDetailResponse struct {
    WellResponse
    LatestDepthMbgl float64   `json:"latest_depth_mbgl"`
    LatestReadingAt time.Time `json:"latest_reading_at"`
    RiskLevel       string    `json:"risk_level"`
}

type WellListResponse struct {
    Data []WellResponse `json:"data"`
    Meta PagedMeta      `json:"meta"`
}

// ── District Stats ────────────────────────────────────────────────────────────

type DistrictStatResponse struct {
    District        string    `json:"district"`
    WellCount       int64     `json:"well_count"`
    AvgDepthMbgl    float64   `json:"avg_depth_mbgl"`
    MaxDepthMbgl    float64   `json:"max_depth_mbgl"`
    MinDepthMbgl    float64   `json:"min_depth_mbgl"`
    DepthChangeQoQ  float64   `json:"depth_change_qoq"`
    RiskStatus      string    `json:"risk_status"`
    CrisisIndex     float64   `json:"crisis_index"`
    LastReadingDate time.Time `json:"last_reading_date"`
}

// ── Alerts ────────────────────────────────────────────────────────────────────

type AlertQuery struct {
    District string `form:"district"`
    Type     string `form:"type"`
}

type AlertResponse struct {
    ID            int64     `json:"id"`
    Type          string    `json:"type"`
    District      string    `json:"district"`
    Title         string    `json:"title"`
    Message       string    `json:"message"`
    ConfidencePct float64   `json:"confidence_pct"`
    Source        string    `json:"source"`
    CreatedAt     time.Time `json:"created_at"`
}

// ── Prediction ────────────────────────────────────────────────────────────────

type PredictRequest struct {
    Latitude    float64 `json:"latitude"     binding:"required,min=-90,max=90"`
    Longitude   float64 `json:"longitude"    binding:"required,min=-180,max=180"`
    RainfallMm  float64 `json:"rainfall_mm"`
    TempC       float64 `json:"temperature_c"`
    HumidityPct float64 `json:"humidity_pct"`
    NDVI        float64 `json:"ndvi"`
}

type MonthForecast struct {
    MonthOffset int     `json:"month_offset"`
    Label       string  `json:"label"`
    DepthMbgl   float64 `json:"depth_mbgl"`
    RiskLevel   string  `json:"risk_level"`
    Confidence  float64 `json:"confidence"`
}

type NearestWell struct {
    WellID     int64   `json:"well_id"`
    Name       string  `json:"name"`
    DistanceKm float64 `json:"distance_km"`
    DepthMbgl  float64 `json:"depth_mbgl"`
}

type PredictResponse struct {
    DepthMbgl           float64         `json:"depth_mbgl"`
    RiskLevel           string          `json:"risk_level"`
    ConfidencePct       float64         `json:"confidence_pct"`
    PredictionPath      string          `json:"prediction_path"`
    XGBoostDepth        float64         `json:"xgboost_depth"`
    LSTMDepth           float64         `json:"lstm_depth"`
    RandomForestDepth   float64         `json:"random_forest_depth"`
    NearestWells        []NearestWell   `json:"nearest_wells"`
    MultiMonthForecast  []MonthForecast `json:"multi_month_forecast"`
    Recommendation      string          `json:"recommendation"`
    ActionableAdvice    []string        `json:"actionable_advice"`
}

// ── Complaints ────────────────────────────────────────────────────────────────

type CreateComplaintRequest struct {
    Type        string `json:"type"        binding:"required,oneof=water_shortage contamination infrastructure other"`
    District    string `json:"district"    binding:"required"`
    Taluka      string `json:"taluka"`
    Village     string `json:"village"`
    Severity    string `json:"severity"    binding:"required,oneof=low medium high critical"`
    Description string `json:"description" binding:"required,min=20"`
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
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

type ComplaintListResponse struct {
    Data []ComplaintResponse `json:"data"`
    Meta PagedMeta           `json:"meta"`
}
```

---

## Step 2 — Repository Layer

### `repository/well_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type WellRepo struct{ db *pgxpool.Pool }

func NewWellRepo(db *pgxpool.Pool) *WellRepo { return &WellRepo{db: db} }

func (r *WellRepo) List(ctx context.Context, q dto.WellListQuery) ([]dto.WellResponse, int64, error) {
    where := "WHERE is_active = TRUE"
    args := []interface{}{}
    i := 1
    if q.District != "" {
        where += fmt.Sprintf(" AND district = $%d", i); args = append(args, q.District); i++
    }

    var total int64
    r.db.QueryRow(ctx, "SELECT COUNT(*) FROM wells "+where, args...).Scan(&total)

    args = append(args, q.Limit, q.Offset())
    rows, err := r.db.Query(ctx,
        `SELECT id, name, district, COALESCE(taluka,''), COALESCE(village,''),
                latitude, longitude, COALESCE(well_type,''),
                COALESCE(depth_total_m,0), COALESCE(affected_families,0)
         FROM wells `+where+fmt.Sprintf(` ORDER BY district, name LIMIT $%d OFFSET $%d`, i, i+1),
        args...,
    )
    if err != nil { return nil, 0, fmt.Errorf("list wells: %w", err) }
    defer rows.Close()

    var wells []dto.WellResponse
    for rows.Next() {
        var w dto.WellResponse
        rows.Scan(&w.ID, &w.Name, &w.District, &w.Taluka, &w.Village,
            &w.Latitude, &w.Longitude, &w.WellType, &w.DepthTotalM, &w.AffectedFamilies)
        wells = append(wells, w)
    }
    return wells, total, rows.Err()
}

func (r *WellRepo) GetDetail(ctx context.Context, id int64) (dto.WellDetailResponse, error) {
    var w dto.WellDetailResponse
    err := r.db.QueryRow(ctx,
        `SELECT w.id, w.name, w.district, COALESCE(w.taluka,''), COALESCE(w.village,''),
                w.latitude, w.longitude, COALESCE(w.well_type,''),
                COALESCE(w.depth_total_m,0), COALESCE(w.affected_families,0),
                COALESCE(wr.depth_mbgl,0), COALESCE(wr.reading_date, NOW()),
                CASE
                    WHEN COALESCE(wr.depth_mbgl,0) > 65 THEN 'DANGER'
                    WHEN COALESCE(wr.depth_mbgl,0) > 50 THEN 'WARNING'
                    WHEN COALESCE(wr.depth_mbgl,0) > 35 THEN 'MODERATE'
                    ELSE 'SAFE'
                END
         FROM wells w
         LEFT JOIN LATERAL (
             SELECT depth_mbgl, reading_date FROM well_readings
             WHERE well_id = w.id ORDER BY reading_date DESC LIMIT 1
         ) wr ON TRUE
         WHERE w.id = $1 AND w.is_active = TRUE`, id,
    ).Scan(&w.ID, &w.Name, &w.District, &w.Taluka, &w.Village,
        &w.Latitude, &w.Longitude, &w.WellType, &w.DepthTotalM, &w.AffectedFamilies,
        &w.LatestDepthMbgl, &w.LatestReadingAt, &w.RiskLevel)
    if err != nil {
        if err == pgx.ErrNoRows { return w, fmt.Errorf("well not found") }
        return w, fmt.Errorf("get well: %w", err)
    }
    return w, nil
}

func (r *WellRepo) GetDistrictStats(ctx context.Context) ([]dto.DistrictStatResponse, error) {
    rows, err := r.db.Query(ctx,
        `SELECT district, well_count, avg_depth_mbgl, max_depth_mbgl, min_depth_mbgl,
                COALESCE(depth_change_qoq,0), risk_status, COALESCE(crisis_index,0), last_reading_date
         FROM district_stats ORDER BY district`)
    if err != nil { return nil, fmt.Errorf("district stats: %w", err) }
    defer rows.Close()

    var stats []dto.DistrictStatResponse
    for rows.Next() {
        var s dto.DistrictStatResponse
        rows.Scan(&s.District, &s.WellCount, &s.AvgDepthMbgl, &s.MaxDepthMbgl, &s.MinDepthMbgl,
            &s.DepthChangeQoQ, &s.RiskStatus, &s.CrisisIndex, &s.LastReadingDate)
        stats = append(stats, s)
    }
    return stats, rows.Err()
}
```

### `repository/alert_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type AlertRepo struct{ db *pgxpool.Pool }

func NewAlertRepo(db *pgxpool.Pool) *AlertRepo { return &AlertRepo{db: db} }

func (r *AlertRepo) GetActive(ctx context.Context, q dto.AlertQuery) ([]dto.AlertResponse, error) {
    where := "WHERE is_active = TRUE"
    args := []interface{}{}
    i := 1

    if q.District != "" {
        where += fmt.Sprintf(" AND (district = $%d OR district IS NULL)", i)
        args = append(args, q.District); i++
    }
    if q.Type != "" {
        where += fmt.Sprintf(" AND type = $%d", i); args = append(args, q.Type); i++
    }

    rows, err := r.db.Query(ctx,
        `SELECT id, type::text, COALESCE(district,''), title, message,
                COALESCE(confidence_pct,0), COALESCE(source,''), created_at
         FROM alerts `+where+` ORDER BY created_at DESC LIMIT 50`,
        args...,
    )
    if err != nil { return nil, fmt.Errorf("get alerts: %w", err) }
    defer rows.Close()

    var alerts []dto.AlertResponse
    for rows.Next() {
        var a dto.AlertResponse
        rows.Scan(&a.ID, &a.Type, &a.District, &a.Title, &a.Message,
            &a.ConfidencePct, &a.Source, &a.CreatedAt)
        alerts = append(alerts, a)
    }
    return alerts, rows.Err()
}
```

### `repository/complaint_repo.go`

```go
package repository

import (
    "context"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ComplaintRepo struct{ db *pgxpool.Pool }

func NewComplaintRepo(db *pgxpool.Pool) *ComplaintRepo { return &ComplaintRepo{db: db} }

func (r *ComplaintRepo) Create(ctx context.Context, userID int64, req dto.CreateComplaintRequest) (dto.ComplaintResponse, error) {
    var c dto.ComplaintResponse
    err := r.db.QueryRow(ctx,
        `INSERT INTO complaints (user_id, type, district, taluka, village, severity, description)
         VALUES ($1, $2, $3, NULLIF($4,''), NULLIF($5,''), $6, $7)
         RETURNING id, tracking_number, type, district,
                   COALESCE(taluka,''), COALESCE(village,''),
                   severity::text, description, status::text, created_at, updated_at`,
        userID, req.Type, req.District, req.Taluka, req.Village, req.Severity, req.Description,
    ).Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District,
        &c.Taluka, &c.Village, &c.Severity, &c.Description,
        &c.Status, &c.CreatedAt, &c.UpdatedAt)
    if err != nil { return c, fmt.Errorf("create complaint: %w", err) }
    return c, nil
}

func (r *ComplaintRepo) GetByTracking(ctx context.Context, tracking string) (dto.ComplaintResponse, error) {
    var c dto.ComplaintResponse
    err := r.db.QueryRow(ctx,
        `SELECT id, tracking_number, type, district,
                COALESCE(taluka,''), COALESCE(village,''),
                severity::text, description, status::text, created_at, updated_at
         FROM complaints WHERE tracking_number = $1`, tracking,
    ).Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District,
        &c.Taluka, &c.Village, &c.Severity, &c.Description,
        &c.Status, &c.CreatedAt, &c.UpdatedAt)
    if err != nil {
        if err == pgx.ErrNoRows { return c, fmt.Errorf("complaint not found") }
        return c, fmt.Errorf("get complaint: %w", err)
    }
    return c, nil
}

func (r *ComplaintRepo) ListByUser(ctx context.Context, userID int64, q dto.PaginationQuery) ([]dto.ComplaintResponse, int64, error) {
    var total int64
    r.db.QueryRow(ctx, `SELECT COUNT(*) FROM complaints WHERE user_id = $1`, userID).Scan(&total)

    rows, err := r.db.Query(ctx,
        `SELECT id, tracking_number, type, district,
                COALESCE(taluka,''), COALESCE(village,''),
                severity::text, description, status::text, created_at, updated_at
         FROM complaints WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        userID, q.Limit, q.Offset(),
    )
    if err != nil { return nil, 0, fmt.Errorf("list complaints: %w", err) }
    defer rows.Close()

    var complaints []dto.ComplaintResponse
    for rows.Next() {
        var c dto.ComplaintResponse
        rows.Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District,
            &c.Taluka, &c.Village, &c.Severity, &c.Description,
            &c.Status, &c.CreatedAt, &c.UpdatedAt)
        complaints = append(complaints, c)
    }
    return complaints, total, rows.Err()
}
```

### `repository/prediction_repo.go`

```go
package repository

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type PredictionRepo struct{ db *pgxpool.Pool }

func NewPredictionRepo(db *pgxpool.Pool) *PredictionRepo { return &PredictionRepo{db: db} }

// Store persists a prediction result for audit and analytics.
func (r *PredictionRepo) Store(ctx context.Context, userID int64, req dto.PredictRequest, resp dto.PredictResponse) error {
    nearestJSON, _ := json.Marshal(resp.NearestWells)
    shapJSON := []byte("{}")
    forecastJSON, _ := json.Marshal(resp.MultiMonthForecast)
    adviceJSON, _ := json.Marshal(resp.ActionableAdvice)

    _, err := r.db.Exec(ctx,
        `INSERT INTO predictions
         (user_id, request_lat, request_lon, depth_mbgl, risk_level, confidence_pct,
          prediction_path, rainfall_mm, temperature_c, ndvi,
          xgboost_depth, lstm_depth, random_forest_depth,
          nearest_wells, shap_features, multi_month_forecast,
          recommendation, actionable_advice)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        userID, req.Latitude, req.Longitude, resp.DepthMbgl, resp.RiskLevel, resp.ConfidencePct,
        resp.PredictionPath, req.RainfallMm, req.TempC, req.NDVI,
        resp.XGBoostDepth, resp.LSTMDepth, resp.RandomForestDepth,
        nearestJSON, shapJSON, forecastJSON,
        resp.Recommendation, adviceJSON,
    )
    if err != nil { return fmt.Errorf("store prediction: %w", err) }
    return nil
}
```

---

## Step 3 — Service Layer

### `service/profile_service.go`

```go
package service

import (
    "context"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ProfileService struct{ db *pgxpool.Pool }

func NewProfileService(db *pgxpool.Pool) *ProfileService { return &ProfileService{db: db} }

func (s *ProfileService) Get(ctx context.Context, userID int64) (dto.ProfileResponse, error) {
    var p dto.ProfileResponse
    err := s.db.QueryRow(ctx,
        `SELECT id, email, name, role::text, COALESCE(district,''), COALESCE(phone,'')
         FROM users WHERE id = $1`, userID,
    ).Scan(&p.ID, &p.Email, &p.Name, &p.Role, &p.District, &p.Phone)
    return p, err
}

func (s *ProfileService) Update(ctx context.Context, userID int64, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
    var p dto.ProfileResponse
    err := s.db.QueryRow(ctx,
        `UPDATE users SET
           name     = COALESCE(NULLIF($2,''), name),
           district = COALESCE(NULLIF($3,''), district),
           phone    = COALESCE(NULLIF($4,''), phone)
         WHERE id = $1
         RETURNING id, email, name, role::text, COALESCE(district,''), COALESCE(phone,'')`,
        userID, req.Name, req.District, req.Phone,
    ).Scan(&p.ID, &p.Email, &p.Name, &p.Role, &p.District, &p.Phone)
    return p, err
}
```

### `service/complaint_service.go`

```go
package service

import (
    "context"
    "math"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type ComplaintService struct{ repo *repository.ComplaintRepo }

func NewComplaintService(repo *repository.ComplaintRepo) *ComplaintService {
    return &ComplaintService{repo: repo}
}

func (s *ComplaintService) Create(ctx context.Context, userID int64, req dto.CreateComplaintRequest) (dto.ComplaintResponse, error) {
    return s.repo.Create(ctx, userID, req)
}

func (s *ComplaintService) Track(ctx context.Context, tracking string) (dto.ComplaintResponse, error) {
    return s.repo.GetByTracking(ctx, tracking)
}

func (s *ComplaintService) Mine(ctx context.Context, userID int64, q dto.PaginationQuery) (dto.ComplaintListResponse, error) {
    complaints, total, err := s.repo.ListByUser(ctx, userID, q)
    if err != nil { return dto.ComplaintListResponse{}, err }
    pages := int(math.Ceil(float64(total) / float64(q.Limit)))
    return dto.ComplaintListResponse{
        Data: complaints,
        Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
    }, nil
}
```

### `service/predict_service.go`

> **Note:** The Python ML engine is not a Go service — it must be called via HTTP or started as a subprocess. This service acts as the **bridge**. For now it contains a stub that returns mock data until the Python microservice is wired up.

```go
package service

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type PredictService struct {
    predRepo   *repository.PredictionRepo
    mlBaseURL  string        // e.g. "http://localhost:8000"
    httpClient *http.Client
}

func NewPredictService(predRepo *repository.PredictionRepo, mlBaseURL string) *PredictService {
    return &PredictService{
        predRepo:   predRepo,
        mlBaseURL:  mlBaseURL,
        httpClient: &http.Client{},
    }
}

// Predict calls the Python ML microservice and stores the result.
// If the ML service is not yet available, it returns a stub response.
func (s *PredictService) Predict(ctx context.Context, userID int64, req dto.PredictRequest) (dto.PredictResponse, error) {
    // Try calling Python ML microservice
    if s.mlBaseURL != "" {
        resp, err := s.callMLService(ctx, req)
        if err == nil {
            s.predRepo.Store(ctx, userID, req, resp) // best-effort, ignore error
            return resp, nil
        }
        // Fall through to stub if ML service unreachable
    }

    // ── STUB: remove once Python service is live ──────────────────
    resp := dto.PredictResponse{
        DepthMbgl:      42.5,
        RiskLevel:      "MODERATE",
        ConfidencePct:  78.3,
        PredictionPath: "ENVIRONMENTAL_ONLY",
        XGBoostDepth:   43.1,
        LSTMDepth:      41.8,
        RandomForestDepth: 42.6,
        Recommendation: "Groundwater is at moderate risk. Consider water conservation.",
        ActionableAdvice: []string{
            "Use drip irrigation",
            "Harvest rainwater",
            "Report water wastage",
        },
        MultiMonthForecast: []dto.MonthForecast{
            {MonthOffset: 1, Label: "Next Month", DepthMbgl: 44.0, RiskLevel: "MODERATE", Confidence: 75},
            {MonthOffset: 2, Label: "Month 2",    DepthMbgl: 46.5, RiskLevel: "MODERATE", Confidence: 68},
            {MonthOffset: 3, Label: "Month 3",    DepthMbgl: 49.2, RiskLevel: "WARNING",   Confidence: 61},
        },
    }
    s.predRepo.Store(ctx, userID, req, resp)
    return resp, nil
}

func (s *PredictService) callMLService(ctx context.Context, req dto.PredictRequest) (dto.PredictResponse, error) {
    body, _ := json.Marshal(req)
    httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.mlBaseURL+"/predict", bytes.NewReader(body))
    if err != nil { return dto.PredictResponse{}, err }
    httpReq.Header.Set("Content-Type", "application/json")

    httpResp, err := s.httpClient.Do(httpReq)
    if err != nil { return dto.PredictResponse{}, fmt.Errorf("ml service unreachable: %w", err) }
    defer httpResp.Body.Close()

    if httpResp.StatusCode != http.StatusOK {
        return dto.PredictResponse{}, fmt.Errorf("ml service error: %d", httpResp.StatusCode)
    }

    var resp dto.PredictResponse
    if err := json.NewDecoder(httpResp.Body).Decode(&resp); err != nil {
        return dto.PredictResponse{}, fmt.Errorf("decode ml response: %w", err)
    }
    return resp, nil
}
```

**Add `ML_SERVICE_URL` to `.env` and `.env.example`:**
```env
ML_SERVICE_URL=http://localhost:8000
```

---

## Step 4 — Handler (`handler/routes.go`) — Replace the stub completely

```go
package handler

import (
    "math"
    "net/http"

    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/service"
    "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes wires all citizen endpoints onto the already-auth-guarded group.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool, mlBaseURL string) {
    // Repositories
    wellRepo      := repository.NewWellRepo(db)
    alertRepo     := repository.NewAlertRepo(db)
    complaintRepo := repository.NewComplaintRepo(db)
    predRepo      := repository.NewPredictionRepo(db)

    // Services
    profileSvc   := service.NewProfileService(db)
    complaintSvc := service.NewComplaintService(complaintRepo)
    predictSvc   := service.NewPredictService(predRepo, mlBaseURL)

    // ── Profile ───────────────────────────────────────────────────────────
    rg.GET("/me", func(c *gin.Context) {
        userID := c.GetInt64(middleware.ContextUserIDKey)
        profile, err := profileSvc.Get(c.Request.Context(), userID)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, profile)
    })

    rg.PATCH("/profile", func(c *gin.Context) {
        var req dto.UpdateProfileRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        userID := c.GetInt64(middleware.ContextUserIDKey)
        profile, err := profileSvc.Update(c.Request.Context(), userID, req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, profile)
    })

    // ── Wells ─────────────────────────────────────────────────────────────
    rg.GET("/wells", func(c *gin.Context) {
        var q dto.WellListQuery
        c.ShouldBindQuery(&q)
        wells, total, err := wellRepo.List(c.Request.Context(), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        pages := int(math.Ceil(float64(total) / float64(q.Limit)))
        c.JSON(http.StatusOK, dto.WellListResponse{
            Data: wells,
            Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
        })
    })

    rg.GET("/wells/:id", func(c *gin.Context) {
        var id int64
        if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"}); return
        }
        well, err := wellRepo.GetDetail(c.Request.Context(), id)
        if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, well)
    })

    // ── District Stats ────────────────────────────────────────────────────
    rg.GET("/districts/summary", func(c *gin.Context) {
        stats, err := wellRepo.GetDistrictStats(c.Request.Context())
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": stats})
    })

    // ── Alerts ────────────────────────────────────────────────────────────
    rg.GET("/alerts", func(c *gin.Context) {
        var q dto.AlertQuery
        c.ShouldBindQuery(&q)
        alerts, err := alertRepo.GetActive(c.Request.Context(), q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, gin.H{"data": alerts})
    })

    // ── Predict ───────────────────────────────────────────────────────────
    rg.POST("/predict", func(c *gin.Context) {
        var req dto.PredictRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        userID := c.GetInt64(middleware.ContextUserIDKey)
        resp, err := predictSvc.Predict(c.Request.Context(), userID, req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, resp)
    })

    // ── Complaints ────────────────────────────────────────────────────────
    rg.POST("/complaints", func(c *gin.Context) {
        var req dto.CreateComplaintRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
        }
        userID := c.GetInt64(middleware.ContextUserIDKey)
        complaint, err := complaintSvc.Create(c.Request.Context(), userID, req)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusCreated, complaint)
    })

    rg.GET("/complaints/mine", func(c *gin.Context) {
        var q dto.PaginationQuery
        c.ShouldBindQuery(&q)
        userID := c.GetInt64(middleware.ContextUserIDKey)
        result, err := complaintSvc.Mine(c.Request.Context(), userID, q)
        if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, result)
    })

    rg.GET("/complaints/track/:number", func(c *gin.Context) {
        complaint, err := complaintSvc.Track(c.Request.Context(), c.Param("number"))
        if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": err.Error()}); return }
        c.JSON(http.StatusOK, complaint)
    })
}
```

> **Note:** Add `import "fmt"` to the handler file for `fmt.Sscan`.

---

## Step 5 — Update Router to Pass `db` and `mlBaseURL`

**In `internal/handler/router.go`**, update the call for common user:
```go
// Before
commonUserHandler.RegisterRoutes(commonUserGroup)

// After
commonUserHandler.RegisterRoutes(commonUserGroup, db, cfg.MLServiceURL)
```

Add `MLServiceURL` to the `Config` struct in `internal/config/config.go`:
```go
MLServiceURL string  // in Config struct

// in Load():
MLServiceURL: getEnv("ML_SERVICE_URL", ""),
```

---

## Step 6 — Seed a Citizen User for Testing

```bash
# Use admin token to create a citizen user
curl -s -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@aq.in","password":"User@12345","name":"Rajan Patil","role":"citizen","district":"Nagpur"}'
```

---

## Step 7 — Smoke Test (curl)

```bash
# Login as citizen
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@aq.in","password":"User@12345"}' | jq -r .token)

# Profile
curl -s http://localhost:8080/api/v1/common-user/me -H "Authorization: Bearer $TOKEN" | jq

# District stats
curl -s http://localhost:8080/api/v1/common-user/districts/summary -H "Authorization: Bearer $TOKEN" | jq

# Predict
curl -s -X POST http://localhost:8080/api/v1/common-user/predict \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"latitude":21.14,"longitude":79.08,"rainfall_mm":12.5,"temperature_c":28.0}' | jq

# File a complaint
curl -s -X POST http://localhost:8080/api/v1/common-user/complaints \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"water_shortage","district":"Nagpur","severity":"high","description":"The borewell in our village has gone completely dry for the last 3 weeks."}' | jq

# Track complaint
curl -s http://localhost:8080/api/v1/common-user/complaints/track/R-ABCD12 \
  -H "Authorization: Bearer $TOKEN" | jq

# My complaints
curl -s http://localhost:8080/api/v1/common-user/complaints/mine \
  -H "Authorization: Bearer $TOKEN" | jq

# Alerts
curl -s "http://localhost:8080/api/v1/common-user/alerts?district=Nagpur" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Complete API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/common-user/me` | Citizen profile from DB |
| PATCH | `/api/v1/common-user/profile` | Update name / district / phone |
| GET | `/api/v1/common-user/wells` | List active wells — `?district=Nagpur&page=1` |
| GET | `/api/v1/common-user/wells/:id` | Well detail with latest depth + risk level |
| GET | `/api/v1/common-user/districts/summary` | All 11 districts from `district_stats` |
| GET | `/api/v1/common-user/alerts` | Active alerts — `?district=Nagpur&type=critical` |
| POST | `/api/v1/common-user/predict` | Groundwater depth prediction |
| POST | `/api/v1/common-user/complaints` | File a new complaint |
| GET | `/api/v1/common-user/complaints/mine` | My complaints — `?page=1&limit=10` |
| GET | `/api/v1/common-user/complaints/track/:number` | Track by `R-XXXXXX` |

---

## Notes on Prediction Pipeline

The `POST /predict` endpoint has two modes:

| Mode | Condition | What happens |
|------|-----------|-------------|
| **Live** | `ML_SERVICE_URL` is set and Python server is running | Forwards request to Python, stores result |
| **Stub** | `ML_SERVICE_URL` is empty or Python is down | Returns hard-coded mock response, stores stub result |

The Python ML server (`main.py`) must expose a `POST /predict` endpoint accepting the same JSON schema as `dto.PredictRequest`. Once the Python service is built and running, set `ML_SERVICE_URL=http://localhost:8000` in `.env`.

---

## Definition of Done

- [ ] `go build ./...` passes
- [ ] All 10 endpoints accessible with citizen JWT
- [ ] Complaint creation returns a tracking number like `R-XXXXXX`
- [ ] Prediction endpoint stores a row in `predictions` table
- [ ] District summary reads from `district_stats` materialized view
- [ ] Alerts filter correctly by district and type
