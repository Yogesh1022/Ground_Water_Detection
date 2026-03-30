package dto

import "time"

// PaginationQuery captures page and limit from query params.
type PaginationQuery struct {
	Page  int `form:"page,default=1"   binding:"min=1"`
	Limit int `form:"limit,default=20" binding:"min=1,max=100"`
}

// Offset calculates SQL OFFSET based on page and limit.
func (p PaginationQuery) Offset() int { return (p.Page - 1) * p.Limit }

// PagedMeta describes pagination metadata for responses.
type PagedMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

// ProfileResponse represents the logged-in officer profile.
type ProfileResponse struct {
	ID       int64  `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	District string `json:"district"`
	Phone    string `json:"phone"`
}

// OverviewResponse aggregates command-center KPIs and dashboard widgets for a district.
type OverviewResponse struct {
	District           string                `json:"district"`
	OpenComplaints     int64                 `json:"open_complaints"`
	ResolvedThisMonth  int64                 `json:"resolved_this_month"`
	ActiveTankerRoutes int64                 `json:"active_tanker_routes"`
	PendingTasks       int64                 `json:"pending_tasks"`
	WellCount          int64                 `json:"well_count"`
	AvgDepthMbgl       float64               `json:"avg_depth_mbgl"`
	RiskStatus         string                `json:"risk_status"`
	CrisisIndex        float64               `json:"crisis_index"`
	CategoryCounts     []CategoryCount       `json:"category_counts,omitempty"`
	CrisisSeries       []CrisisIndexPoint    `json:"crisis_series,omitempty"`
	PriorityRequests   []PriorityRequest     `json:"priority_requests,omitempty"`
	RecentActivity     []RecentActivityEntry `json:"recent_activity,omitempty"`
}

// CategoryCount is used for requests-by-category chart.
type CategoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// CrisisIndexPoint is used for crisis index chart over districts.
type CrisisIndexPoint struct {
	District string  `json:"district"`
	Score    float64 `json:"score"`
}

// PriorityRequest represents a high-priority request row.
type PriorityRequest struct {
	ID          int64  `json:"id"`
	TrackingNo  string `json:"tracking_number"`
	Issue       string `json:"issue"`
	Village     string `json:"village"`
	Priority    string `json:"priority"`
	Status      string `json:"status"`
	AssignedTo  string `json:"assigned_to"`
	SubmittedAt string `json:"submitted_at"`
}

// RecentActivityEntry represents dashboard activity feed items.
type RecentActivityEntry struct {
	Timestamp string      `json:"timestamp"`
	Actor     string      `json:"actor"`
	Action    string      `json:"action"`
	Target    string      `json:"target"`
	Details   interface{} `json:"details"`
}

// ComplaintListQuery filters complaint listing.
type ComplaintListQuery struct {
	PaginationQuery
	Status   string `form:"status"`
	Severity string `form:"severity"`
	Type     string `form:"type"`
	Priority string `form:"priority"`
	Q        string `form:"q"`
	FromDate string `form:"from"`
	ToDate   string `form:"to"`
	Format   string `form:"format"`
}

// ComplaintResponse presents complaint data.
type ComplaintResponse struct {
	ID                int64     `json:"id"`
	TrackingNumber    string    `json:"tracking_number"`
	Type              string    `json:"type"`
	District          string    `json:"district"`
	Taluka            string    `json:"taluka"`
	Village           string    `json:"village"`
	Severity          string    `json:"severity"`
	Priority          string    `json:"priority"`
	Description       string    `json:"description"`
	Status            string    `json:"status"`
	AssignedOfficerID *int64    `json:"assigned_officer_id"`
	EscalationNote    string    `json:"escalation_note"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ComplaintListResponse wraps complaints with pagination metadata.
type ComplaintListResponse struct {
	Data []ComplaintResponse `json:"data"`
	Meta PagedMeta           `json:"meta"`
}

// ComplaintDetailResponse mirrors list response; kept for extensibility.
type ComplaintDetailResponse = ComplaintResponse

// AssignComplaintRequest assigns a complaint to an officer.
type AssignComplaintRequest struct {
	OfficerID int64  `json:"officer_id" binding:"required"`
	Note      string `json:"note"`
}

// UpdateComplaintStatusRequest updates complaint status.
type UpdateComplaintStatusRequest struct {
	Status         string `json:"status"          binding:"required,oneof=open in_review in_progress resolved escalated"`
	EscalationNote string `json:"escalation_note"`
}

// DistrictAnalyticsResponse holds aggregated metrics.
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

// MonthlyDepthPoint represents a monthly aggregated depth.
type MonthlyDepthPoint struct {
	Month     string  `json:"month"`
	AvgDepth  float64 `json:"avg_depth_mbgl"`
	WellCount int64   `json:"well_count"`
}

// RainfallDepthPoint for scatter plot.
type RainfallDepthPoint struct {
	RainfallMM int     `json:"rainfall_mm"`
	DepthMbgl  float64 `json:"depth_mbgl"`
}

// DistrictSummaryRow for table view.
type DistrictSummaryRow struct {
	District     string  `json:"district"`
	AvgDepthMbgl float64 `json:"avg_depth_mbgl"`
	Change       float64 `json:"change"`
	Wells        int64   `json:"wells"`
	Reports      int64   `json:"reports"`
	Risk         string  `json:"risk"`
	Tankers      int64   `json:"tankers"`
}

// ForecastResponse holds district forecast values.
type ForecastResponse struct {
	District string          `json:"district"`
	Forecast []MonthForecast `json:"forecast"`
}

// MonthForecast represents one month forecast.
type MonthForecast struct {
	MonthOffset int     `json:"month_offset"`
	Label       string  `json:"label"`
	DepthMbgl   float64 `json:"depth_mbgl"`
	RiskLevel   string  `json:"risk_level"`
	Confidence  float64 `json:"confidence"`
}

// Forecast90DayPoint holds time-series values and confidence bands.
type Forecast90DayPoint struct {
	Month     string  `json:"month"`
	DepthMbgl float64 `json:"depth_mbgl"`
	UpperBand float64 `json:"upper_band"`
	LowerBand float64 `json:"lower_band"`
}

// ShapFeature captures feature importance for SHAP chart.
type ShapFeature struct {
	Name       string  `json:"name"`
	Importance float64 `json:"importance"`
}

// CrisisZone summarizes crisis-level districts.
type CrisisZone struct {
	District    string  `json:"district"`
	RiskStatus  string  `json:"risk_status"`
	CrisisIndex float64 `json:"crisis_index"`
	AvgDepth    float64 `json:"avg_depth_mbgl"`
	WellCount   int64   `json:"well_count"`
}

// TankerResponse describes tanker route details.
type TankerResponse struct {
	ID             int64     `json:"id"`
	RouteName      string    `json:"route_name"`
	District       string    `json:"district"`
	Villages       []string  `json:"villages"`
	Schedule       string    `json:"schedule"`
	CapacityLiters int       `json:"capacity_liters"`
	Status         string    `json:"status"`
	AssignedDriver string    `json:"assigned_driver"`
	ContactNumber  string    `json:"contact_number"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreateTankerRequest creates a tanker route.
type CreateTankerRequest struct {
	RouteName      string   `json:"route_name"      binding:"required"`
	Villages       []string `json:"villages"        binding:"required,min=1"`
	Schedule       string   `json:"schedule"`
	CapacityLiters int      `json:"capacity_liters"`
	AssignedDriver string   `json:"assigned_driver"`
	ContactNumber  string   `json:"contact_number"`
}

// UpdateTankerRequest updates schedule/driver/capacity/status.
type UpdateTankerRequest struct {
	RouteName      string   `json:"route_name"`
	Villages       []string `json:"villages"`
	Schedule       string   `json:"schedule"`
	CapacityLiters int      `json:"capacity_liters"`
	AssignedDriver string   `json:"assigned_driver"`
	ContactNumber  string   `json:"contact_number"`
	Status         string   `json:"status"`
}

// TaskResponse represents a task assignment.
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

// CreateTaskRequest defines request to create a task.
type CreateTaskRequest struct {
	ComplaintID       int64  `json:"complaint_id"        binding:"required"`
	AssigneeOfficerID int64  `json:"assignee_officer_id" binding:"required"`
	Priority          string `json:"priority"            binding:"required,oneof=low medium high urgent"`
	Notes             string `json:"notes"`
	DueDate           string `json:"due_date"`
}

// UpdateTaskRequest updates task status/notes.
type UpdateTaskRequest struct {
	Status string `json:"status" binding:"required,oneof=pending in_progress completed cancelled"`
	Notes  string `json:"notes"`
}

// ReassignTaskRequest changes the assignee.
type ReassignTaskRequest struct {
	AssigneeOfficerID int64  `json:"assignee_officer_id" binding:"required"`
	Notes             string `json:"notes"`
}

// TaskListResponse wraps tasks with pagination.
type TaskListResponse struct {
	Data []TaskResponse `json:"data"`
	Meta PagedMeta      `json:"meta"`
}

// WorkloadEntry summarizes per-officer task load.
type WorkloadEntry struct {
	OfficerID   int64  `json:"officer_id"`
	OfficerName string `json:"officer_name"`
	Pending     int64  `json:"pending"`
	InProgress  int64  `json:"in_progress"`
	Completed   int64  `json:"completed"`
	Total       int64  `json:"total"`
}

// ActivityLogQuery filters audit logs.
type ActivityLogQuery struct {
	PaginationQuery
	Action string `form:"action"`
	Actor  string `form:"actor"`
	From   string `form:"from"`
	To     string `form:"to"`
}

// ActivityEntry represents a single audit log entry.
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

// ActivityLogResponse wraps activity entries with pagination metadata.
type ActivityLogResponse struct {
	Data []ActivityEntry `json:"data"`
	Meta PagedMeta       `json:"meta"`
}

// ReportJobResponse represents async report job status.
type ReportJobResponse struct {
	JobID      string `json:"job_id"`
	Status     string `json:"status"`
	FileURL    string `json:"file_url,omitempty"`
	Message    string `json:"message,omitempty"`
	ReportType string `json:"report_type,omitempty"`
}
