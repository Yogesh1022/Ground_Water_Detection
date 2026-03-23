package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PredictionRepo struct{ db *pgxpool.Pool }

func NewPredictionRepo(db *pgxpool.Pool) *PredictionRepo { return &PredictionRepo{db: db} }

func (r *PredictionRepo) Store(ctx context.Context, req dto.PredictRequest, resp dto.PredictResponse) error {
	nearestWells, err := json.Marshal(resp.NearestWells)
	if err != nil {
		return fmt.Errorf("marshal nearest wells: %w", err)
	}
	forecast, err := json.Marshal(resp.MultiMonthForecast)
	if err != nil {
		return fmt.Errorf("marshal forecast: %w", err)
	}
	advice, err := json.Marshal(resp.ActionableAdvice)
	if err != nil {
		return fmt.Errorf("marshal advice: %w", err)
	}

	_, err = r.db.Exec(
		ctx,
		`INSERT INTO predictions (
		    request_lat, request_lon, depth_mbgl, risk_level, confidence_pct, prediction_path,
		    rainfall_mm, temperature_c, ndvi,
		    xgboost_depth, lstm_depth, random_forest_depth,
		    nearest_wells, multi_month_forecast, recommendation, actionable_advice
		)
		VALUES ($1, $2, $3, $4::risk_level, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16::jsonb)`,
		req.Latitude,
		req.Longitude,
		resp.DepthMbgl,
		resp.RiskLevel,
		resp.ConfidencePct,
		resp.PredictionPath,
		req.RainfallMm,
		req.TempC,
		req.NDVI,
		resp.XGBoostDepth,
		resp.LSTMDepth,
		resp.RandomForestDepth,
		nearestWells,
		forecast,
		resp.Recommendation,
		advice,
	)
	if err != nil {
		return fmt.Errorf("store prediction: %w", err)
	}

	return nil
}
