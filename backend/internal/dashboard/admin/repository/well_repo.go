package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WellRepo struct{ db *pgxpool.Pool }

func NewWellRepo(db *pgxpool.Pool) *WellRepo { return &WellRepo{db: db} }

func (r *WellRepo) List(ctx context.Context, q dto.ListWellsQuery) ([]dto.WellResponse, int64, error) {
	q.PaginationQuery.Normalize()

	where := "WHERE 1=1"
	args := []interface{}{}
	idx := 1

	if q.District != "" {
		where += fmt.Sprintf(" AND district = $%d", idx)
		args = append(args, q.District)
		idx++
	}
	if q.Active != nil {
		where += fmt.Sprintf(" AND is_active = $%d", idx)
		args = append(args, *q.Active)
		idx++
	}

	var total int64
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM wells "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count wells: %w", err)
	}

	args = append(args, q.Limit, q.Offset())
	rows, err := r.db.Query(
		ctx,
		`SELECT id, name, district, COALESCE(taluka,''), COALESCE(village,''),
		        latitude, longitude, COALESCE(well_type,''), COALESCE(depth_total_m,0),
		        COALESCE(aquifer_type,''), COALESCE(affected_families,0), is_active, created_at
		 FROM wells `+where+fmt.Sprintf(` ORDER BY district, name LIMIT $%d OFFSET $%d`, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list wells: %w", err)
	}
	defer rows.Close()

	wells := make([]dto.WellResponse, 0, q.Limit)
	for rows.Next() {
		var w dto.WellResponse
		if err := rows.Scan(
			&w.ID,
			&w.Name,
			&w.District,
			&w.Taluka,
			&w.Village,
			&w.Latitude,
			&w.Longitude,
			&w.WellType,
			&w.DepthTotalM,
			&w.AquiferType,
			&w.AffectedFamilies,
			&w.IsActive,
			&w.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan well row: %w", err)
		}
		wells = append(wells, w)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate well rows: %w", err)
	}

	return wells, total, nil
}

func (r *WellRepo) Create(ctx context.Context, req dto.CreateWellRequest) (dto.WellResponse, error) {
	var w dto.WellResponse
	err := r.db.QueryRow(
		ctx,
		`INSERT INTO wells (name, district, taluka, village, latitude, longitude, well_type, depth_total_m, aquifer_type, affected_families)
		 VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), $5, $6, NULLIF($7,''), $8, NULLIF($9,''), $10)
		 RETURNING id, name, district, COALESCE(taluka,''), COALESCE(village,''),
		           latitude, longitude, COALESCE(well_type,''), COALESCE(depth_total_m,0),
		           COALESCE(aquifer_type,''), COALESCE(affected_families,0), is_active, created_at`,
		req.Name,
		req.District,
		req.Taluka,
		req.Village,
		req.Latitude,
		req.Longitude,
		req.WellType,
		req.DepthTotalM,
		req.AquiferType,
		req.AffectedFamilies,
	).Scan(
		&w.ID,
		&w.Name,
		&w.District,
		&w.Taluka,
		&w.Village,
		&w.Latitude,
		&w.Longitude,
		&w.WellType,
		&w.DepthTotalM,
		&w.AquiferType,
		&w.AffectedFamilies,
		&w.IsActive,
		&w.CreatedAt,
	)
	if err != nil {
		return dto.WellResponse{}, fmt.Errorf("create well: %w", err)
	}

	return w, nil
}

func (r *WellRepo) Count(ctx context.Context) (int64, error) {
	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM wells WHERE is_active = TRUE`).Scan(&total); err != nil {
		return 0, fmt.Errorf("count active wells: %w", err)
	}
	return total, nil
}
