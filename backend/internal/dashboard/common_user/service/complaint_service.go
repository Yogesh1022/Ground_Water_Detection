package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type ComplaintService struct {
	repo *repository.ComplaintRepo
}

func NewComplaintService(repo *repository.ComplaintRepo) *ComplaintService {
	return &ComplaintService{repo: repo}
}

func (s *ComplaintService) Create(ctx context.Context, req dto.CreateComplaintRequest) (dto.ComplaintResponse, error) {
	return s.repo.Create(ctx, req)
}

func (s *ComplaintService) Track(ctx context.Context, tracking string) (dto.ComplaintResponse, error) {
	return s.repo.GetByTracking(ctx, tracking)
}
