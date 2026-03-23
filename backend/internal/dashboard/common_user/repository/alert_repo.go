package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertRepo struct{ db *pgxpool.Pool }

func NewAlertRepo(db *pgxpool.Pool) *AlertRepo { return &AlertRepo{db: db} }

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
