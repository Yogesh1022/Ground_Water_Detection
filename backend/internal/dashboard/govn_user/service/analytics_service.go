package service

import (
	"context"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
)

// AnalyticsService provides analytics and forecast data.
type AnalyticsService struct{ repo *repository.DistrictRepo }

// NewAnalyticsService constructs service.
func NewAnalyticsService(repo *repository.DistrictRepo) *AnalyticsService {
	return &AnalyticsService{repo: repo}
}

// GetAnalytics returns district analytics with monthly trend.
func (s *AnalyticsService) GetAnalytics(ctx context.Context, district string) (dto.DistrictAnalyticsResponse, error) {
	analytics, err := s.repo.GetStats(ctx, district)
	if err != nil {
		return analytics, err
	}
	trend, err := s.repo.GetMonthlyTrend(ctx, district)
	if err != nil {
		return analytics, err
	}
	analytics.MonthlyTrend = trend
	return analytics, nil
}

// GetCrisisZones returns crisis zones across districts.
func (s *AnalyticsService) GetCrisisZones(ctx context.Context) ([]dto.CrisisZone, error) {
	return s.repo.GetAllCrisisZones(ctx)
}

// GetForecast returns a simple heuristic forecast; replace with ML service later.
func (s *AnalyticsService) GetForecast(ctx context.Context, district string) (dto.ForecastResponse, error) {
	stats, err := s.repo.GetStats(ctx, district)
	if err != nil {
		return dto.ForecastResponse{}, err
	}

	base := stats.AvgDepthMbgl
	months := []struct {
		offset int
		label  string
	}{{1, "Next Month"}, {2, "Month 2"}, {3, "Month 3"}}

	var forecast []dto.MonthForecast
	for _, m := range months {
		depth := base + float64(m.offset)*1.8
		risk := "SAFE"
		switch {
		case depth > 65:
			risk = "DANGER"
		case depth > 50:
			risk = "WARNING"
		case depth > 35:
			risk = "MODERATE"
		}
		forecast = append(forecast, dto.MonthForecast{
			MonthOffset: m.offset,
			Label:       m.label,
			DepthMbgl:   depth,
			RiskLevel:   risk,
			Confidence:  85.0 - float64(m.offset)*5,
		})
	}
	return dto.ForecastResponse{District: district, Forecast: forecast}, nil
}

// GetRainfallVsDepth returns scatter data.
func (s *AnalyticsService) GetRainfallVsDepth(ctx context.Context, district string) ([]dto.RainfallDepthPoint, error) {
	return s.repo.GetRainfallVsDepth(ctx, district, 80)
}

// GetDistrictSummary returns summary table rows.
func (s *AnalyticsService) GetDistrictSummary(ctx context.Context) ([]dto.DistrictSummaryRow, error) {
	return s.repo.GetDistrictSummary(ctx)
}

// GetForecast90 returns banded 90-day forecast points.
func (s *AnalyticsService) GetForecast90(ctx context.Context, district string) ([]dto.Forecast90DayPoint, error) {
	return s.repo.GetForecastBands(ctx, district)
}

// GetShapFeatures returns feature importances for SHAP chart.
func (s *AnalyticsService) GetShapFeatures(ctx context.Context, district string) ([]dto.ShapFeature, error) {
	return s.repo.GetShapFeatures(ctx, district)
}
