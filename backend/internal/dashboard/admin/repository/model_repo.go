package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ModelRepo struct{ db *pgxpool.Pool }

func NewModelRepo(db *pgxpool.Pool) *ModelRepo { return &ModelRepo{db: db} }

func (r *ModelRepo) ListModels(ctx context.Context) ([]dto.ModelResponse, error) {
	rows, err := r.db.Query(
		ctx,
		`SELECT id, model_name, version, status::text,
		        COALESCE(r2_score,0), COALESCE(rmse,0), COALESCE(mae,0),
		        COALESCE(training_rows,0), COALESCE(feature_count,0), COALESCE(notes,''),
		        COALESCE(trained_at, registered_at)
		 FROM ml_model_registry
		 ORDER BY registered_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list models: %w", err)
	}
	defer rows.Close()

	models := make([]dto.ModelResponse, 0)
	for rows.Next() {
		var m dto.ModelResponse
		if err := rows.Scan(
			&m.ID,
			&m.ModelName,
			&m.Version,
			&m.Status,
			&m.R2Score,
			&m.RMSE,
			&m.MAE,
			&m.TrainingRows,
			&m.FeatureCount,
			&m.Notes,
			&m.TrainedAt,
		); err != nil {
			return nil, fmt.Errorf("scan model row: %w", err)
		}
		models = append(models, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate model rows: %w", err)
	}

	return models, nil
}

func (r *ModelRepo) ListDataSources(ctx context.Context) ([]dto.DataSourceResponse, error) {
	rows, err := r.db.Query(
		ctx,
		`SELECT id, source_name, source_type, COALESCE(description,''),
		        COALESCE(record_count,0), COALESCE(update_frequency,''), COALESCE(coverage,''),
		        COALESCE(quality_score,0), is_active, COALESCE(last_synced_at, created_at)
		 FROM data_sources
		 ORDER BY source_name`,
	)
	if err != nil {
		return nil, fmt.Errorf("list data sources: %w", err)
	}
	defer rows.Close()

	sources := make([]dto.DataSourceResponse, 0)
	for rows.Next() {
		var d dto.DataSourceResponse
		if err := rows.Scan(
			&d.ID,
			&d.SourceName,
			&d.SourceType,
			&d.Description,
			&d.RecordCount,
			&d.UpdateFrequency,
			&d.Coverage,
			&d.QualityScore,
			&d.IsActive,
			&d.LastSyncedAt,
		); err != nil {
			return nil, fmt.Errorf("scan data source row: %w", err)
		}
		sources = append(sources, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate data source rows: %w", err)
	}

	return sources, nil
}

func (r *ModelRepo) GetOverviewStats(ctx context.Context) (int64, int64, float64, error) {
	var totalPredictions int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM predictions`).Scan(&totalPredictions); err != nil {
		return 0, 0, 0, fmt.Errorf("count predictions: %w", err)
	}

	var openComplaints int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM complaints WHERE status = 'open'`).Scan(&openComplaints); err != nil {
		return 0, 0, 0, fmt.Errorf("count open complaints: %w", err)
	}

	var avgDepth float64
	if err := r.db.QueryRow(ctx, `SELECT COALESCE(AVG(avg_depth_mbgl), 0) FROM district_stats`).Scan(&avgDepth); err != nil {
		return 0, 0, 0, fmt.Errorf("get avg depth from district stats: %w", err)
	}

	return totalPredictions, openComplaints, avgDepth, nil
}
