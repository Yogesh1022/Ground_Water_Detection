package dto

import "time"

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 100
)

// PaginationQuery represents common list pagination query params.
type PaginationQuery struct {
	Page  int `form:"page,default=1" binding:"min=1"`
	Limit int `form:"limit,default=20" binding:"min=1,max=100"`
}

// Normalize applies safe defaults and guardrails when query binding is absent/partial.
func (p *PaginationQuery) Normalize() {
	if p.Page < 1 {
		p.Page = DefaultPage
	}
	if p.Limit < 1 {
		p.Limit = DefaultLimit
	}
	if p.Limit > MaxLimit {
		p.Limit = MaxLimit
	}
}

func (p PaginationQuery) Offset() int { return (p.Page - 1) * p.Limit }

type PagedMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

// ListUsersQuery provides user list filters and pagination.
type ListUsersQuery struct {
	PaginationQuery
	Role     string `form:"role"`
	District string `form:"district"`
	Search   string `form:"search"`
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
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
	Role     string `json:"role" binding:"required,oneof=citizen gov admin"`
	District string `json:"district"`
	Phone    string `json:"phone"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	District string `json:"district"`
	Phone    string `json:"phone"`
	Role     string `json:"role" binding:"omitempty,oneof=citizen gov admin"`
}

// ListWellsQuery provides well list filters and pagination.
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
	Name             string  `json:"name" binding:"required"`
	District         string  `json:"district" binding:"required"`
	Taluka           string  `json:"taluka"`
	Village          string  `json:"village"`
	Latitude         float64 `json:"latitude" binding:"required"`
	Longitude        float64 `json:"longitude" binding:"required"`
	WellType         string  `json:"well_type"`
	DepthTotalM      float64 `json:"depth_total_m"`
	AquiferType      string  `json:"aquifer_type"`
	AffectedFamilies int     `json:"affected_families"`
}

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

type SettingResponse struct {
	Key         string      `json:"key"`
	Value       interface{} `json:"value"`
	Description string      `json:"description"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type UpdateSettingsRequest struct {
	Settings map[string]interface{} `json:"settings" binding:"required"`
}

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

type CreateAlertRequest struct {
	Type       string  `json:"type" binding:"required,oneof=critical warning info success"`
	District   string  `json:"district"`
	Title      string  `json:"title" binding:"required"`
	Message    string  `json:"message" binding:"required"`
	Confidence float64 `json:"confidence_pct"`
	Source     string  `json:"source"`
}

type AlertResponse struct {
	ID            int64     `json:"id"`
	Type          string    `json:"type"`
	District      string    `json:"district"`
	Title         string    `json:"title"`
	Message       string    `json:"message"`
	ConfidencePct float64   `json:"confidence_pct"`
	Source        string    `json:"source"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
}

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
