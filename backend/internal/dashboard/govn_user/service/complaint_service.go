package service

import (
	"context"
	"math"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

// ComplaintService encapsulates complaint operations.
type ComplaintService struct {
	repo      *repository.ComplaintRepo
	auditRepo *repository.AuditRepo
}

// NewComplaintService constructs service.
func NewComplaintService(repo *repository.ComplaintRepo, auditRepo *repository.AuditRepo) *ComplaintService {
	return &ComplaintService{repo: repo, auditRepo: auditRepo}
}

// List returns paginated complaints.
func (s *ComplaintService) List(ctx context.Context, district string, q dto.ComplaintListQuery) (dto.ComplaintListResponse, error) {
	complaints, total, err := s.repo.ListByDistrict(ctx, district, q)
	if err != nil {
		return dto.ComplaintListResponse{}, err
	}
	pages := int(math.Ceil(float64(total) / float64(q.Limit)))
	return dto.ComplaintListResponse{
		Data: complaints,
		Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
	}, nil
}

// Assign assigns a complaint to an officer and writes audit.
func (s *ComplaintService) Assign(ctx context.Context, id int64, req dto.AssignComplaintRequest, actorID int64, actorRole, ip, requestID string) error {
	if err := s.repo.Assign(ctx, id, req.OfficerID, req.Note); err != nil {
		return err
	}
	s.auditRepo.WriteLog(ctx, actorID, actorRole, "ASSIGN_COMPLAINT", "complaints", id,
		map[string]interface{}{"officer_id": req.OfficerID, "note": req.Note}, ip, requestID)
	return nil
}

// UpdateStatus updates status and writes audit entry.
func (s *ComplaintService) UpdateStatus(ctx context.Context, id int64, req dto.UpdateComplaintStatusRequest, actorID int64, actorRole, ip, requestID string) error {
	if err := s.repo.UpdateStatus(ctx, id, req.Status, req.EscalationNote); err != nil {
		return err
	}
	s.auditRepo.WriteLog(ctx, actorID, actorRole, "UPDATE_COMPLAINT_STATUS", "complaints", id,
		map[string]interface{}{"status": req.Status}, ip, requestID)
	return nil
}

// Detail returns a single complaint.
func (s *ComplaintService) Detail(ctx context.Context, id int64) (dto.ComplaintDetailResponse, error) {
	return s.repo.GetByID(ctx, id)
}

// Export returns the filtered list for export (delegates to List without pagination cap).
func (s *ComplaintService) Export(ctx context.Context, district string, q dto.ComplaintListQuery) ([]dto.ComplaintResponse, error) {
	q.Limit = 5000
	complaints, _, err := s.repo.ListByDistrict(ctx, district, q)
	return complaints, err
}
