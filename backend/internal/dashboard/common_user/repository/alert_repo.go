package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertRepo struct{ db *pgxpool.Pool }

func NewAlertRepo(db *pgxpool.Pool) *AlertRepo { return &AlertRepo{db: db} }

func (r *AlertRepo) RefreshRiskAlerts(ctx context.Context) error {
	_, err := r.db.Exec(
		ctx,
		`DELETE FROM alerts WHERE source IN ('system_seed', 'auto_district_risk');

		INSERT INTO alerts (type, district, title, message, confidence_pct, source, is_active)
		SELECT
			CASE
				WHEN ds.risk_status = 'DANGER' THEN 'critical'::alert_type
				WHEN ds.risk_status = 'WARNING' THEN 'warning'::alert_type
				ELSE 'info'::alert_type
			END,
			ds.district,
			ds.district || ' groundwater ' || LOWER(ds.risk_status),
			CASE
				WHEN ds.risk_status = 'DANGER' THEN
					'Average groundwater depth is ' || COALESCE(ds.avg_depth_mbgl::text, 'N/A') ||
					' mbgl. Immediate conservation and tanker planning is advised.'
				WHEN ds.risk_status = 'WARNING' THEN
					'Groundwater depth trend indicates increasing stress (' || COALESCE(ds.avg_depth_mbgl::text, 'N/A') ||
					' mbgl). Please reduce non-essential use.'
				ELSE
					'Moderate groundwater stress detected (' || COALESCE(ds.avg_depth_mbgl::text, 'N/A') ||
					' mbgl). Continue preventive conservation measures.'
			END,
			LEAST(95, GREATEST(60, COALESCE(ds.crisis_index, 70))),
			'auto_district_risk',
			TRUE
		FROM district_stats ds
		WHERE ds.risk_status IN ('DANGER', 'WARNING', 'MODERATE')
		ORDER BY ds.avg_depth_mbgl DESC;`,
	)
	if err != nil {
		return fmt.Errorf("refresh risk alerts: %w", err)
	}

	return nil
}

func (r *AlertRepo) GetActive(ctx context.Context, q dto.AlertQuery) ([]dto.AlertResponse, error) {
	where := "WHERE is_active = TRUE"
	args := []interface{}{}
	idx := 1

	if q.District != "" {
		where += fmt.Sprintf(" AND district = $%d", idx)
		args = append(args, q.District)
		idx++
	}
	if q.Type != "" {
		where += fmt.Sprintf(" AND type = $%d", idx)
		args = append(args, q.Type)
		idx++
	}

	rows, err := r.db.Query(
		ctx,
		`SELECT id, type::text, COALESCE(district,''), title, message,
		        COALESCE(confidence_pct,0), COALESCE(source,''), created_at
		 FROM alerts `+where+` ORDER BY created_at DESC LIMIT 100`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("list alerts: %w", err)
	}
	defer rows.Close()

	alerts := make([]dto.AlertResponse, 0)
	for rows.Next() {
		var a dto.AlertResponse
		if err := rows.Scan(
			&a.ID,
			&a.Type,
			&a.District,
			&a.Title,
			&a.Message,
			&a.ConfidencePct,
			&a.Source,
			&a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan alert row: %w", err)
		}
		alerts = append(alerts, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate alerts: %w", err)
	}

	return alerts, nil
}
