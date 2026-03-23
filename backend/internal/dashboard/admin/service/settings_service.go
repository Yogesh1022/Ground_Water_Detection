package service

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type SettingsService struct {
	repo      *repository.SettingsRepo
	auditRepo *repository.AuditRepo
}

func NewSettingsService(repo *repository.SettingsRepo, auditRepo *repository.AuditRepo) *SettingsService {
	return &SettingsService{repo: repo, auditRepo: auditRepo}
}

func (s *SettingsService) GetAll(ctx context.Context) ([]dto.SettingResponse, error) {
	return s.repo.GetAll(ctx)
}

func (s *SettingsService) Update(
	ctx context.Context,
	req dto.UpdateSettingsRequest,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) error {
	if err := s.repo.UpsertBatch(ctx, req.Settings, actorID); err != nil {
		return fmt.Errorf("update settings: %w", err)
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"UPDATE_SETTINGS",
		"system_settings",
		0,
		req.Settings,
		ip,
		requestID,
	); err != nil {
		return fmt.Errorf("audit update settings: %w", err)
	}

	return nil
}
