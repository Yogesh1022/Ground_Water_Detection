package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type WellService struct {
	repo *repository.WellRepo
}

func NewWellService(repo *repository.WellRepo) *WellService {
	return &WellService{repo: repo}
}

func (s *WellService) List(ctx context.Context, q dto.WellListQuery) (dto.WellListResponse, error) {
	q.PaginationQuery.Normalize()

	wells, total, err := s.repo.List(ctx, q)
	if err != nil {
		return dto.WellListResponse{}, err
	}

	return dto.WellListResponse{
		Data: wells,
		Meta: buildPagedMeta(q.Page, q.Limit, total),
	}, nil
}

func (s *WellService) GetDetail(ctx context.Context, id int64) (dto.WellDetailResponse, error) {
	return s.repo.GetDetail(ctx, id)
}

func (s *WellService) DistrictStats(ctx context.Context) ([]dto.DistrictStatResponse, error) {
	return s.repo.GetDistrictStats(ctx)
}
