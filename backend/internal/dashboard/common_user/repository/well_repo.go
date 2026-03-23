package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WellRepo struct{ db *pgxpool.Pool }

func NewWellRepo(db *pgxpool.Pool) *WellRepo { return &WellRepo{db: db} }

func (r *WellRepo) List(ctx context.Context, q dto.WellListQuery) ([]dto.WellResponse, int64, error) {
	q.PaginationQuery.Normalize()

	where := "WHERE is_active = TRUE"
	args := []interface{}{}
	idx := 1

	if q.District != "" {
		where += fmt.Sprintf(" AND district = $%d", idx)
		args = append(args, q.District)
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
		        latitude, longitude, COALESCE(well_type,''), COALESCE(depth_total_m,0), COALESCE(affected_families,0)
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
			&w.AffectedFamilies,
		); err != nil {
			return nil, 0, fmt.Errorf("scan well row: %w", err)
		}
		wells = append(wells, w)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate wells: %w", err)
	}

	return wells, total, nil
}

func (r *WellRepo) GetDetail(ctx context.Context, id int64) (dto.WellDetailResponse, error) {
	var w dto.WellDetailResponse
	err := r.db.QueryRow(
		ctx,
		`SELECT w.id, w.name, w.district, COALESCE(w.taluka,''), COALESCE(w.village,''),
		        w.latitude, w.longitude, COALESCE(w.well_type,''), COALESCE(w.depth_total_m,0), COALESCE(w.affected_families,0),
		        COALESCE(wr.depth_mbgl,0), COALESCE(wr.reading_date::timestamptz, NOW()),
		        CASE
		            WHEN COALESCE(wr.depth_mbgl,0) > 65 THEN 'DANGER'
		            WHEN COALESCE(wr.depth_mbgl,0) > 50 THEN 'WARNING'
		            WHEN COALESCE(wr.depth_mbgl,0) > 35 THEN 'MODERATE'
		            ELSE 'SAFE'
		        END AS risk_level
		 FROM wells w
		 LEFT JOIN LATERAL (
		     SELECT depth_mbgl, reading_date
		     FROM well_readings
		     WHERE well_id = w.id
		     ORDER BY reading_date DESC
		     LIMIT 1
		 ) wr ON TRUE
		 WHERE w.id = $1 AND w.is_active = TRUE`,
		id,
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
		&w.AffectedFamilies,
		&w.LatestDepthMbgl,
		&w.LatestReadingAt,
		&w.RiskLevel,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return dto.WellDetailResponse{}, ErrNotFound
		}
		return dto.WellDetailResponse{}, fmt.Errorf("get well detail: %w", err)
	}

	return w, nil
}

func (r *WellRepo) GetDistrictStats(ctx context.Context) ([]dto.DistrictStatResponse, error) {
	rows, err := r.db.Query(
		ctx,
		`SELECT district, well_count, avg_depth_mbgl, max_depth_mbgl, min_depth_mbgl,
		        COALESCE(depth_change_qoq,0), risk_status, COALESCE(crisis_index,0), COALESCE(last_reading_date::timestamptz, NOW())
		 FROM district_stats
		 ORDER BY district`,
	)
	if err != nil {
		return nil, fmt.Errorf("list district stats: %w", err)
	}
	defer rows.Close()

	stats := make([]dto.DistrictStatResponse, 0)
	for rows.Next() {
		var s dto.DistrictStatResponse
		if err := rows.Scan(
			&s.District,
			&s.WellCount,
			&s.AvgDepthMbgl,
			&s.MaxDepthMbgl,
			&s.MinDepthMbgl,
			&s.DepthChangeQoQ,
			&s.RiskStatus,
			&s.CrisisIndex,
			&s.LastReadingDate,
		); err != nil {
			return nil, fmt.Errorf("scan district stat: %w", err)
		}
		stats = append(stats, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate district stats: %w", err)
	}

	return stats, nil
}
