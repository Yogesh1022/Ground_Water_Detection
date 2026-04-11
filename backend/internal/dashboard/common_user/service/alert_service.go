package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

type AlertService struct {
	repo *repository.AlertRepo
}

func NewAlertService(repo *repository.AlertRepo) *AlertService {
	return &AlertService{repo: repo}
}

func (s *AlertService) ListActive(ctx context.Context, q dto.AlertQuery) ([]dto.AlertResponse, error) {
	if err := s.repo.RefreshRiskAlerts(ctx); err != nil {
		return nil, err
	}

	return s.repo.GetActive(ctx, q)
}
