package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

type AuditService struct {
	repo *repository.AuditRepo
}

func NewAuditService(repo *repository.AuditRepo) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) List(ctx context.Context, q dto.AuditLogQuery) (dto.AuditLogResponse, error) {
	q.PaginationQuery.Normalize()

	entries, total, err := s.repo.List(ctx, q)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}

	return dto.AuditLogResponse{
		Data: entries,
		Meta: buildPagedMeta(q.Page, q.Limit, total),
	}, nil
}
