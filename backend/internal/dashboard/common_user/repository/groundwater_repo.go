package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GroundwaterReadingsRepo struct{ db *pgxpool.Pool }

func NewGroundwaterReadingsRepo(db *pgxpool.Pool) *GroundwaterReadingsRepo {
	return &GroundwaterReadingsRepo{db: db}
}

func (r *GroundwaterReadingsRepo) ListReadings(ctx context.Context, q dto.GroundwaterReadingQuery) ([]dto.GroundwaterReadingResponse, int64, error) {
	q.PaginationQuery.Normalize()

	// Build WHERE clause
	where := "WHERE wr.reading_date IS NOT NULL"
	args := []interface{}{}
	idx := 1

	if q.District != "" {
		where += fmt.Sprintf(" AND w.district = $%d", idx)
		args = append(args, q.District)
		idx++
	}

	if q.WellID > 0 {
		where += fmt.Sprintf(" AND wr.well_id = $%d", idx)
		args = append(args, q.WellID)
		idx++
	}

	if q.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", q.StartDate)
		if err == nil {
			where += fmt.Sprintf(" AND wr.reading_date >= $%d", idx)
			args = append(args, startDate)
			idx++
		}
	}

	if q.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", q.EndDate)
		if err == nil {
			where += fmt.Sprintf(" AND wr.reading_date <= $%d", idx)
			args = append(args, endDate.AddDate(0, 0, 1)) // end of day
			idx++
		}
	}

	// Validate sort fields
	sortBy := "wr.reading_date"
	if q.SortBy == "well_id" {
		sortBy = "wr.well_id"
	} else if q.SortBy == "depth_mbgl" {
		sortBy = "wr.depth_mbgl"
	} else if q.SortBy == "rainfall_mm" {
		sortBy = "wr.rainfall_mm"
	}

	sortOrder := "DESC"
	if q.SortOrder == "ASC" {
		sortOrder = "ASC"
	}

	// Count total rows
	countQuery := "SELECT COUNT(*) FROM well_readings wr JOIN wells w ON wr.well_id = w.id " + where
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count groundwater readings: %w", err)
	}

	// Fetch paginated data
	args = append(args, q.Limit, q.Offset())
	listQuery := `
		SELECT 
			wr.id, wr.well_id, w.name, w.district, wr.reading_date,
			wr.depth_mbgl, wr.rainfall_mm, wr.temperature_c, wr.humidity_pct,
			wr.et0_mm, wr.rainfall_30d_mm,
			wr.rainfall_90d_mm, wr.rainfall_deficit_mm,
			wr.depth_lag_1q, wr.depth_lag_2q,
			wr.month, wr.season, w.latitude, w.longitude, wr.ndvi
		FROM well_readings wr
		JOIN wells w ON wr.well_id = w.id
		` + where + `
		ORDER BY ` + sortBy + ` ` + sortOrder + `
		LIMIT $` + fmt.Sprintf("%d", idx) + ` OFFSET $` + fmt.Sprintf("%d", idx+1)

	rows, err := r.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query groundwater readings: %w", err)
	}
	defer rows.Close()

	readings := make([]dto.GroundwaterReadingResponse, 0, q.Limit)
	for rows.Next() {
		var r dto.GroundwaterReadingResponse
		if err := rows.Scan(
			&r.ID, &r.WellID, &r.WellName, &r.District, &r.ReadingDate,
			&r.DepthMbgl, &r.RainfallMm, &r.TemperatureAvg, &r.Humidity,
			&r.Evapotranspiration, &r.RainfallLag1m,
			&r.RainfallLag2m, &r.RainfallDeficit,
			&r.DepthLag1q, &r.DepthLag2q,
			&r.Month, &r.Season, &r.Latitude, &r.Longitude, &r.NDVI,
		); err != nil {
			return nil, 0, fmt.Errorf("scan groundwater reading row: %w", err)
		}
		readings = append(readings, r)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate groundwater readings: %w", err)
	}

	return readings, total, nil
}
