package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type OverviewService struct {
	userRepo  *repository.UserRepo
	wellRepo  *repository.WellRepo
	modelRepo *repository.ModelRepo
}

func NewOverviewService(
	userRepo *repository.UserRepo,
	wellRepo *repository.WellRepo,
	modelRepo *repository.ModelRepo,
) *OverviewService {
	return &OverviewService{userRepo: userRepo, wellRepo: wellRepo, modelRepo: modelRepo}
}

func (s *OverviewService) GetOverview(ctx context.Context) (dto.OverviewResponse, error) {
	countsByRole, err := s.userRepo.CountByRole(ctx)
	if err != nil {
		return dto.OverviewResponse{}, err
	}

	totalWells, err := s.wellRepo.Count(ctx)
	if err != nil {
		return dto.OverviewResponse{}, err
	}

	totalPredictions, openComplaints, avgDepthMbgl, err := s.modelRepo.GetOverviewStats(ctx)
	if err != nil {
		return dto.OverviewResponse{}, err
	}

	return dto.OverviewResponse{
		TotalUsers:       countsByRole["citizen"] + countsByRole["gov"] + countsByRole["admin"],
		ActiveCitizens:   countsByRole["citizen"],
		GovOfficers:      countsByRole["gov"],
		TotalWells:       totalWells,
		TotalPredictions: totalPredictions,
		OpenComplaints:   openComplaints,
		TotalDistricts:   11,
		AvgDepthMbgl:     avgDepthMbgl,
	}, nil
}
