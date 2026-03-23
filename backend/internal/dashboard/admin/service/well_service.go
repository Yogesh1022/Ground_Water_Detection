package service

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type WellService struct {
	repo      *repository.WellRepo
	auditRepo *repository.AuditRepo
}

func NewWellService(repo *repository.WellRepo, auditRepo *repository.AuditRepo) *WellService {
	return &WellService{repo: repo, auditRepo: auditRepo}
}

func (s *WellService) List(ctx context.Context, q dto.ListWellsQuery) (dto.ListWellsResponse, error) {
	q.PaginationQuery.Normalize()

	wells, total, err := s.repo.List(ctx, q)
	if err != nil {
		return dto.ListWellsResponse{}, err
	}

	return dto.ListWellsResponse{
		Data: wells,
		Meta: buildPagedMeta(q.Page, q.Limit, total),
	}, nil
}

func (s *WellService) Create(
	ctx context.Context,
	req dto.CreateWellRequest,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) (dto.WellResponse, error) {
	well, err := s.repo.Create(ctx, req)
	if err != nil {
		return dto.WellResponse{}, fmt.Errorf("create well: %w", err)
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"CREATE_WELL",
		"wells",
		well.ID,
		map[string]interface{}{"name": well.Name, "district": well.District},
		ip,
		requestID,
	); err != nil {
		return dto.WellResponse{}, fmt.Errorf("audit create well: %w", err)
	}

	return well, nil
}
