package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ComplaintRepo struct{ db *pgxpool.Pool }

func NewComplaintRepo(db *pgxpool.Pool) *ComplaintRepo { return &ComplaintRepo{db: db} }

func (r *ComplaintRepo) Create(ctx context.Context, req dto.CreateComplaintRequest) (dto.ComplaintResponse, error) {
	var c dto.ComplaintResponse
	err := r.db.QueryRow(
		ctx,
		`INSERT INTO complaints (type, district, taluka, village, severity, description)
		 VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), $5::complaint_severity, $6)
		 RETURNING id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
		           severity::text, description, status::text, created_at, updated_at`,
		req.Type,
		req.District,
		req.Taluka,
		req.Village,
		req.Severity,
		req.Description,
	).Scan(
		&c.ID,
		&c.TrackingNumber,
		&c.Type,
		&c.District,
		&c.Taluka,
		&c.Village,
		&c.Severity,
		&c.Description,
		&c.Status,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return dto.ComplaintResponse{}, fmt.Errorf("create complaint: %w", err)
	}

	return c, nil
}

func (r *ComplaintRepo) GetByTracking(ctx context.Context, tracking string) (dto.ComplaintResponse, error) {
	var c dto.ComplaintResponse
	err := r.db.QueryRow(
		ctx,
		`SELECT id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
		        severity::text, description, status::text, created_at, updated_at
		 FROM complaints
		 WHERE tracking_number = $1`,
		tracking,
	).Scan(
		&c.ID,
		&c.TrackingNumber,
		&c.Type,
		&c.District,
		&c.Taluka,
		&c.Village,
		&c.Severity,
		&c.Description,
		&c.Status,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return dto.ComplaintResponse{}, ErrNotFound
		}
		return dto.ComplaintResponse{}, fmt.Errorf("get complaint by tracking: %w", err)
	}

	return c, nil
}
