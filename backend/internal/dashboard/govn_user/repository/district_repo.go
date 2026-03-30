package repository

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DistrictRepo reads district stats and trends.
type DistrictRepo struct{ db *pgxpool.Pool }

// NewDistrictRepo creates the repo.
func NewDistrictRepo(db *pgxpool.Pool) *DistrictRepo { return &DistrictRepo{db: db} }

// GetStats returns aggregated stats for a district.
func (r *DistrictRepo) GetStats(ctx context.Context, district string) (dto.DistrictAnalyticsResponse, error) {
	var a dto.DistrictAnalyticsResponse
	err := r.db.QueryRow(ctx,
		`SELECT district, well_count, avg_depth_mbgl, max_depth_mbgl, min_depth_mbgl,
                risk_status, COALESCE(crisis_index,0), COALESCE(depth_change_qoq,0)
         FROM district_stats WHERE district = $1`, district,
	).Scan(&a.District, &a.WellCount, &a.AvgDepthMbgl, &a.MaxDepthMbgl, &a.MinDepthMbgl,
		&a.RiskStatus, &a.CrisisIndex, &a.DepthChangeQoQ)
	if err != nil {
		return a, fmt.Errorf("district stats for %s: %w", district, err)
	}
	return a, nil
}

// GetMonthlyTrend returns monthly depth trend for the past 12 months.
func (r *DistrictRepo) GetMonthlyTrend(ctx context.Context, district string) ([]dto.MonthlyDepthPoint, error) {
	rows, err := r.db.Query(ctx,
		`SELECT TO_CHAR(wr.reading_date, 'YYYY-MM') AS month,
                ROUND(AVG(wr.depth_mbgl)::NUMERIC, 2) AS avg_depth,
                COUNT(DISTINCT wr.well_id) AS well_count
         FROM well_readings wr
         JOIN wells w ON w.id = wr.well_id
         WHERE w.district = $1
           AND wr.reading_date >= NOW() - INTERVAL '12 months'
         GROUP BY TO_CHAR(wr.reading_date, 'YYYY-MM')
         ORDER BY month ASC`, district,
	)
	if err != nil {
		return nil, fmt.Errorf("monthly trend: %w", err)
	}
	defer rows.Close()

	var points []dto.MonthlyDepthPoint
	for rows.Next() {
		var p dto.MonthlyDepthPoint
		rows.Scan(&p.Month, &p.AvgDepth, &p.WellCount)
		points = append(points, p)
	}
	return points, rows.Err()
}

// GetAllCrisisZones returns crisis stats for all districts.
func (r *DistrictRepo) GetAllCrisisZones(ctx context.Context) ([]dto.CrisisZone, error) {
	rows, err := r.db.Query(ctx,
		`SELECT district, risk_status, COALESCE(crisis_index,0), avg_depth_mbgl, well_count
         FROM district_stats ORDER BY crisis_index DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []dto.CrisisZone
	for rows.Next() {
		var z dto.CrisisZone
		rows.Scan(&z.District, &z.RiskStatus, &z.CrisisIndex, &z.AvgDepth, &z.WellCount)
		zones = append(zones, z)
	}
	return zones, rows.Err()
}

// GetRainfallVsDepth returns paired rainfall vs depth points for scatter plot.
func (r *DistrictRepo) GetRainfallVsDepth(ctx context.Context, district string, limit int) ([]dto.RainfallDepthPoint, error) {
	rows, err := r.db.Query(ctx,
		`SELECT COALESCE(wr.rainfall_mm,0)::int AS rain, COALESCE(wr.depth_mbgl,0)
		 FROM well_readings wr
		 JOIN wells w ON w.id = wr.well_id
		 WHERE w.district = $1
		 ORDER BY wr.reading_date DESC
		 LIMIT $2`, district, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("rainfall vs depth: %w", err)
	}
	defer rows.Close()

	var points []dto.RainfallDepthPoint
	for rows.Next() {
		var p dto.RainfallDepthPoint
		rows.Scan(&p.RainfallMM, &p.DepthMbgl)
		points = append(points, p)
	}
	return points, rows.Err()
}

// GetDistrictSummary aggregates table view across districts.
func (r *DistrictRepo) GetDistrictSummary(ctx context.Context) ([]dto.DistrictSummaryRow, error) {
	rows, err := r.db.Query(ctx,
		`WITH stats AS (
			 SELECT district, avg_depth_mbgl, COALESCE(depth_change_qoq,0) AS change, well_count, crisis_index, risk_status
			 FROM district_stats
		 ),
		 reports AS (
			 SELECT district, COUNT(*) AS report_count
			 FROM complaints
			 GROUP BY district
		 ),
		 tankers AS (
			 SELECT district, COUNT(*) AS tanker_count
			 FROM tanker_routes
			 GROUP BY district
		 )
		 SELECT s.district, s.avg_depth_mbgl, s.change, s.well_count,
				COALESCE(r.report_count,0), s.risk_status, COALESCE(t.tanker_count,0)
		 FROM stats s
		 LEFT JOIN reports r ON r.district = s.district
		 LEFT JOIN tankers t ON t.district = s.district
		 ORDER BY s.crisis_index DESC`)
	if err != nil {
		return nil, fmt.Errorf("district summary: %w", err)
	}
	defer rows.Close()

	var out []dto.DistrictSummaryRow
	for rows.Next() {
		var d dto.DistrictSummaryRow
		rows.Scan(&d.District, &d.AvgDepthMbgl, &d.Change, &d.Wells, &d.Reports, &d.Risk, &d.Tankers)
		out = append(out, d)
	}
	return out, rows.Err()
}

// GetForecastBands generates a lightweight 90-day series with bands using district stats as seed.
func (r *DistrictRepo) GetForecastBands(ctx context.Context, district string) ([]dto.Forecast90DayPoint, error) {
	stats, err := r.GetStats(ctx, district)
	if err != nil {
		return nil, err
	}
	base := stats.AvgDepthMbgl
	rand.Seed(time.Now().UnixNano())
	var series []dto.Forecast90DayPoint
	months := []string{"Apr", "May", "Jun"}
	for i, m := range months {
		delta := float64(i+1) * 1.8
		noise := rand.Float64()*0.6 - 0.3
		depth := base + delta + noise
		band := 0.8 + float64(i)*0.1
		series = append(series, dto.Forecast90DayPoint{
			Month:     m,
			DepthMbgl: depth,
			UpperBand: depth + band,
			LowerBand: depth - band,
		})
	}
	return series, nil
}

// GetShapFeatures builds synthetic SHAP feature importances based on district stats.
func (r *DistrictRepo) GetShapFeatures(ctx context.Context, district string) ([]dto.ShapFeature, error) {
	stats, err := r.GetStats(ctx, district)
	if err != nil {
		return nil, err
	}
	return []dto.ShapFeature{
		{Name: "Depth (mbgl)", Importance: stats.AvgDepthMbgl / 100},
		{Name: "Well Count", Importance: float64(stats.WellCount) / 200.0},
		{Name: "Crisis Index", Importance: stats.CrisisIndex / 10},
		{Name: "Risk", Importance: 0.4},
	}, nil
}
