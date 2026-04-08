package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type GroundwaterReadingService struct {
	repo *repository.GroundwaterReadingsRepo
}

func NewGroundwaterReadingService(repo *repository.GroundwaterReadingsRepo) *GroundwaterReadingService {
	return &GroundwaterReadingService{repo: repo}
}

func (s *GroundwaterReadingService) ListReadings(ctx context.Context, q dto.GroundwaterReadingQuery) (dto.GroundwaterReadingListResponse, error) {
	q.PaginationQuery.Normalize()

	readings, total, err := s.repo.ListReadings(ctx, q)
	if err != nil {
		return dto.GroundwaterReadingListResponse{}, err
	}

	return dto.GroundwaterReadingListResponse{
		Data: readings,
		Meta: buildPagedMeta(q.Page, q.Limit, total),
	}, nil
}
