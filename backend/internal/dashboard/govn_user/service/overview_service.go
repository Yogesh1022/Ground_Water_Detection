package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

// OverviewService aggregates high-level KPIs for gov officers.
type OverviewService struct {
	complaintRepo *repository.ComplaintRepo
	tankerRepo    *repository.TankerRepo
	taskRepo      *repository.TaskRepo
	districtRepo  *repository.DistrictRepo
	auditRepo     *repository.AuditRepo
}

// NewOverviewService constructs service.
func NewOverviewService(c *repository.ComplaintRepo, t *repository.TankerRepo, ta *repository.TaskRepo, d *repository.DistrictRepo, a *repository.AuditRepo) *OverviewService {
	return &OverviewService{complaintRepo: c, tankerRepo: t, taskRepo: ta, districtRepo: d, auditRepo: a}
}

// GetOverview returns aggregated KPI metrics for the officer's district.
func (s *OverviewService) GetOverview(ctx context.Context, district string) (dto.OverviewResponse, error) {
	counts, _ := s.complaintRepo.CountByStatus(ctx, district)
	categories, _ := s.complaintRepo.CountByCategory(ctx, district)
	priority, _ := s.complaintRepo.GetPriorityRequests(ctx, district, 8)
	activeTankers, _ := s.tankerRepo.CountActive(ctx, district)
	pendingTasks, _ := s.taskRepo.CountPending(ctx, district)
	stats, _ := s.districtRepo.GetStats(ctx, district)
	crisis, _ := s.districtRepo.GetAllCrisisZones(ctx)
	recent, _ := s.auditRepo.GetRecentFeed(ctx, district, 6)

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
		CategoryCounts:     categories,
		CrisisSeries:       toCrisisPoints(crisis),
		PriorityRequests:   priority,
		RecentActivity:     recent,
	}, nil
}

// toCrisisPoints maps crisis zones to chart points.
func toCrisisPoints(zones []dto.CrisisZone) []dto.CrisisIndexPoint {
	out := make([]dto.CrisisIndexPoint, 0, len(zones))
	for _, z := range zones {
		out = append(out, dto.CrisisIndexPoint{District: z.District, Score: z.CrisisIndex})
	}
	return out
}
