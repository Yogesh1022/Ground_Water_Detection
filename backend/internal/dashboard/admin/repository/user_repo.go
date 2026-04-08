package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type UserRepo struct{ db *pgxpool.Pool }

func NewUserRepo(db *pgxpool.Pool) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) List(ctx context.Context, q dto.ListUsersQuery) ([]dto.UserResponse, int64, error) {
	q.PaginationQuery.Normalize()

	where := "WHERE 1=1"
	args := []interface{}{}
	idx := 1

	if q.Role != "" {
		where += fmt.Sprintf(" AND role = $%d", idx)
		args = append(args, q.Role)
		idx++
	}
	if q.District != "" {
		where += fmt.Sprintf(" AND district = $%d", idx)
		args = append(args, q.District)
		idx++
	}
	if q.Search != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR email ILIKE $%d)", idx, idx)
		args = append(args, "%"+q.Search+"%")
		idx++
	}
	if q.Active != nil {
		where += fmt.Sprintf(" AND is_active = $%d", idx)
		args = append(args, *q.Active)
		idx++
	}

	var total int64
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM users "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	args = append(args, q.Limit, q.Offset())
	rows, err := r.db.Query(
		ctx,
		`SELECT id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at
		 FROM users `+where+fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	users := make([]dto.UserResponse, 0, q.Limit)
	for rows.Next() {
		var u dto.UserResponse
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan user row: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate user rows: %w", err)
	}

	return users, total, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (dto.UserResponse, error) {
	var u dto.UserResponse
	err := r.db.QueryRow(
		ctx,
		`SELECT id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.UserResponse{}, ErrNotFound
		}
		return dto.UserResponse{}, fmt.Errorf("get user by id: %w", err)
	}

	return u, nil
}

func (r *UserRepo) Create(ctx context.Context, req dto.CreateUserRequest) (dto.UserResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return dto.UserResponse{}, fmt.Errorf("hash password: %w", err)
	}

	var u dto.UserResponse
	err = r.db.QueryRow(
		ctx,
		`INSERT INTO users (email, password_hash, name, role, district, phone)
		 VALUES (LOWER($1), $2, $3, $4, NULLIF($5,''), NULLIF($6,''))
		 RETURNING id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at`,
		req.Email,
		string(hash),
		req.Name,
		req.Role,
		req.District,
		req.Phone,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
	if err != nil {
		return dto.UserResponse{}, fmt.Errorf("create user: %w", err)
	}

	return u, nil
}

func (r *UserRepo) Update(ctx context.Context, id int64, req dto.UpdateUserRequest) (dto.UserResponse, error) {
	var u dto.UserResponse
	err := r.db.QueryRow(
		ctx,
		`UPDATE users SET
		   name = COALESCE(NULLIF($2,''), name),
		   district = COALESCE(NULLIF($3,''), district),
		   phone = COALESCE(NULLIF($4,''), phone),
		   role = COALESCE(NULLIF($5,''), role)
		 WHERE id = $1
		 RETURNING id, email, name, role, COALESCE(district,''), COALESCE(phone,''), is_active, created_at`,
		id,
		req.Name,
		req.District,
		req.Phone,
		req.Role,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.District, &u.Phone, &u.IsActive, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.UserResponse{}, ErrNotFound
		}
		return dto.UserResponse{}, fmt.Errorf("update user: %w", err)
	}

	return u, nil
}

func (r *UserRepo) SetActive(ctx context.Context, id int64, active bool) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET is_active = $2 WHERE id = $1`, id, active)
	if err != nil {
		return fmt.Errorf("set user active: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepo) Delete(ctx context.Context, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepo) CountByRole(ctx context.Context) (map[string]int64, error) {
	rows, err := r.db.Query(ctx, `SELECT role::text, COUNT(*) FROM users GROUP BY role`)
	if err != nil {
		return nil, fmt.Errorf("count users by role: %w", err)
	}
	defer rows.Close()

	counts := map[string]int64{"citizen": 0, "gov": 0, "admin": 0}
	for rows.Next() {
		var role string
		var count int64
		if err := rows.Scan(&role, &count); err != nil {
			return nil, fmt.Errorf("scan role count: %w", err)
		}
		counts[role] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role counts: %w", err)
	}

	return counts, nil
}
