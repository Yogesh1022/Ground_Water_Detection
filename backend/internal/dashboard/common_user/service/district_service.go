package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type DistrictService struct {
	wellRepo *repository.WellRepo
}

func NewDistrictService(wellRepo *repository.WellRepo) *DistrictService {
	return &DistrictService{wellRepo: wellRepo}
}

func (s *DistrictService) Summary(ctx context.Context) ([]dto.DistrictStatResponse, error) {
	return s.wellRepo.GetDistrictStats(ctx)
}
