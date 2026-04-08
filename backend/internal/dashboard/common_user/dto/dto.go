package dto

import "time"

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 100
)

type PaginationQuery struct {
	Page  int `form:"page,default=1" binding:"min=1"`
	Limit int `form:"limit,default=20" binding:"min=1,max=100"`
}

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

type ProfileResponse struct {
	ID       int64  `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	District string `json:"district"`
	Phone    string `json:"phone"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name" binding:"omitempty,min=2"`
	District string `json:"district"`
	Phone    string `json:"phone"`
}

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

type PredictRequest struct {
	Latitude    float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude   float64 `json:"longitude" binding:"required,min=-180,max=180"`
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
	DepthMbgl          float64         `json:"depth_mbgl"`
	RiskLevel          string          `json:"risk_level"`
	ConfidencePct      float64         `json:"confidence_pct"`
	PredictionPath     string          `json:"prediction_path"`
	XGBoostDepth       float64         `json:"xgboost_depth"`
	LSTMDepth          float64         `json:"lstm_depth"`
	RandomForestDepth  float64         `json:"random_forest_depth"`
	NearestWells       []NearestWell   `json:"nearest_wells"`
	MultiMonthForecast []MonthForecast `json:"multi_month_forecast"`
	Recommendation     string          `json:"recommendation"`
	ActionableAdvice   []string        `json:"actionable_advice"`
}

type CreateComplaintRequest struct {
	Type        string `json:"type" binding:"required,oneof=water_shortage contamination infrastructure other"`
	District    string `json:"district" binding:"required"`
	Taluka      string `json:"taluka"`
	Village     string `json:"village"`
	Severity    string `json:"severity" binding:"required,oneof=low medium high critical"`
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

// GroundwaterReadings DTOs for CSV data endpoint
type GroundwaterReadingQuery struct {
	PaginationQuery
	District  string    `form:"district"`
	WellID    int64     `form:"well_id"`
	StartDate string    `form:"start_date"` // YYYY-MM-DD
	EndDate   string    `form:"end_date"`   // YYYY-MM-DD
	SortBy    string    `form:"sort_by" default:"reading_date"`
	SortOrder string    `form:"sort_order" default:"DESC"`
}

type GroundwaterReadingResponse struct {
	ID                 int64      `json:"id"`
	WellID             int64      `json:"well_id"`
	WellName           string     `json:"well_name"`
	District           string     `json:"district"`
	ReadingDate        time.Time  `json:"reading_date"`
	DepthMbgl          *float64   `json:"depth_mbgl"`
	RainfallMm         *float64   `json:"rainfall_mm"`
	TemperatureAvg     *float64   `json:"temperature_avg"`
	Humidity           *float64   `json:"humidity"`
	Evapotranspiration *float64   `json:"evapotranspiration"` // et0_mm from DB
	RainfallLag1m      *float64   `json:"rainfall_lag_1m"`    // rainfall_30d_mm from DB
	RainfallLag2m      *float64   `json:"rainfall_lag_2m"`    // rainfall_90d_mm from DB
	RainfallDeficit    *float64   `json:"rainfall_deficit"`
	DepthLag1q         *float64   `json:"depth_lag_1q"`
	DepthLag2q         *float64   `json:"depth_lag_2q"`
	Month              int        `json:"month"`
	Season             string     `json:"season"`
	Latitude           float64    `json:"latitude"`
	Longitude          float64    `json:"longitude"`
	NDVI               *float64   `json:"ndvi"`
}

type GroundwaterReadingListResponse struct {
	Data []GroundwaterReadingResponse `json:"data"`
	Meta PagedMeta                    `json:"meta"`
}
