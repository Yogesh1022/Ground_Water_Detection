package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
)

var (
	ErrCannotSuspendOwnAccount = errors.New("cannot suspend your own account")
	ErrCannotDeleteOwnAccount  = errors.New("cannot delete your own account")
)

type UserService struct {
	repo      *repository.UserRepo
	auditRepo *repository.AuditRepo
}

func NewUserService(repo *repository.UserRepo, auditRepo *repository.AuditRepo) *UserService {
	return &UserService{repo: repo, auditRepo: auditRepo}
}

func (s *UserService) List(ctx context.Context, q dto.ListUsersQuery) (dto.ListUsersResponse, error) {
	q.PaginationQuery.Normalize()

	users, total, err := s.repo.List(ctx, q)
	if err != nil {
		return dto.ListUsersResponse{}, err
	}

	return dto.ListUsersResponse{
		Data: users,
		Meta: buildPagedMeta(q.Page, q.Limit, total),
	}, nil
}

func (s *UserService) GetByID(ctx context.Context, id int64) (dto.UserResponse, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *UserService) Create(
	ctx context.Context,
	req dto.CreateUserRequest,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) (dto.UserResponse, error) {
	created, err := s.repo.Create(ctx, req)
	if err != nil {
		return dto.UserResponse{}, fmt.Errorf("create user: %w", err)
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"CREATE_USER",
		"users",
		created.ID,
		map[string]interface{}{"email": created.Email, "role": created.Role},
		ip,
		requestID,
	); err != nil {
		return dto.UserResponse{}, fmt.Errorf("audit create user: %w", err)
	}

	return created, nil
}

func (s *UserService) Update(
	ctx context.Context,
	id int64,
	req dto.UpdateUserRequest,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) (dto.UserResponse, error) {
	updated, err := s.repo.Update(ctx, id, req)
	if err != nil {
		return dto.UserResponse{}, err
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"UPDATE_USER",
		"users",
		id,
		map[string]interface{}{"changes": req},
		ip,
		requestID,
	); err != nil {
		return dto.UserResponse{}, fmt.Errorf("audit update user: %w", err)
	}

	return updated, nil
}

func (s *UserService) Suspend(
	ctx context.Context,
	id int64,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) error {
	if id == actorID {
		return ErrCannotSuspendOwnAccount
	}

	if err := s.repo.SetActive(ctx, id, false); err != nil {
		return err
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"SUSPEND_USER",
		"users",
		id,
		nil,
		ip,
		requestID,
	); err != nil {
		return fmt.Errorf("audit suspend user: %w", err)
	}

	return nil
}

func (s *UserService) Activate(
	ctx context.Context,
	id int64,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) error {
	if err := s.repo.SetActive(ctx, id, true); err != nil {
		return err
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"ACTIVATE_USER",
		"users",
		id,
		nil,
		ip,
		requestID,
	); err != nil {
		return fmt.Errorf("audit activate user: %w", err)
	}

	return nil
}

func (s *UserService) Delete(
	ctx context.Context,
	id int64,
	actorID int64,
	actorRole,
	ip,
	requestID string,
) error {
	if id == actorID {
		return ErrCannotDeleteOwnAccount
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	if err := s.auditRepo.WriteLog(
		ctx,
		actorID,
		actorRole,
		"DELETE_USER",
		"users",
		id,
		nil,
		ip,
		requestID,
	); err != nil {
		return fmt.Errorf("audit delete user: %w", err)
	}

	return nil
}
