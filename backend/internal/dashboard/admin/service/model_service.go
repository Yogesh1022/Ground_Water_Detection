package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type ModelService struct {
	repo *repository.ModelRepo
}

func NewModelService(repo *repository.ModelRepo) *ModelService {
	return &ModelService{repo: repo}
}

func (s *ModelService) ListModels(ctx context.Context) ([]dto.ModelResponse, error) {
	return s.repo.ListModels(ctx)
}

func (s *ModelService) ListDataSources(ctx context.Context) ([]dto.DataSourceResponse, error) {
	return s.repo.ListDataSources(ctx)
}
