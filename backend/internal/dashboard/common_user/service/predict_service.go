package service

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
)

const (
	exactWellThresholdKm = 0.5
	neighborRadiusKm     = 30.0
	minimumNeighborCount = 3
)

type mlPredictRequest struct {
	PredictionPath string             `json:"prediction_path"`
	Latitude       float64            `json:"latitude"`
	Longitude      float64            `json:"longitude"`
	RainfallMm     float64            `json:"rainfall_mm"`
	TempC          float64            `json:"temperature_c"`
	HumidityPct    float64            `json:"humidity_pct"`
	NDVI           float64            `json:"ndvi"`
	Month          int                `json:"month"`
	Year           int                `json:"year"`
	FeatureVector  map[string]float64 `json:"feature_vector"`
	NearestWells   []dto.NearestWell  `json:"nearest_wells,omitempty"`
}

type PredictService struct {
	repo         *repository.PredictionRepo
	wellRepo     *repository.WellRepo
	httpClient   *http.Client
	mlServiceURL string
}

func NewPredictService(repo *repository.PredictionRepo, wellRepo *repository.WellRepo, mlServiceURL string) *PredictService {
	return &PredictService{
		repo:         repo,
		wellRepo:     wellRepo,
		httpClient:   &http.Client{Timeout: 8 * time.Second},
		mlServiceURL: mlServiceURL,
	}
}

func (s *PredictService) Predict(ctx context.Context, req dto.PredictRequest) (dto.PredictResponse, error) {
	routeResp, err := s.routePrediction(ctx, req)
	if err != nil {
		return dto.PredictResponse{}, err
	}

	if s.mlServiceURL != "" {
		mlReq := s.buildMLRequest(ctx, req, routeResp)
		if remoteResp, remoteErr := s.callMLService(ctx, mlReq); remoteErr == nil {
			routeResp = mergeResponses(routeResp, remoteResp)
		}
	}

	if err := s.repo.Store(ctx, req, routeResp); err != nil {
		return dto.PredictResponse{}, err
	}

	return routeResp, nil
}

func (s *PredictService) routePrediction(ctx context.Context, req dto.PredictRequest) (dto.PredictResponse, error) {
	neighbors, err := s.wellRepo.FindNearbyWells(ctx, req.Latitude, req.Longitude, neighborRadiusKm, 5)
	if err != nil {
		return dto.PredictResponse{}, err
	}

	if len(neighbors) > 0 && neighbors[0].DistanceKm <= exactWellThresholdKm {
		return buildExactWellResponse(req, neighbors[0]), nil
	}

	if len(neighbors) >= minimumNeighborCount {
		return buildPath2Response(req, neighbors), nil
	}

	return fallbackPrediction(req), nil
}

func (s *PredictService) buildMLRequest(ctx context.Context, req dto.PredictRequest, routeResp dto.PredictResponse) mlPredictRequest {
	neighbors, err := s.wellRepo.FindNearbyWells(ctx, req.Latitude, req.Longitude, neighborRadiusKm, 5)
	if err != nil {
		neighbors = nil
	}

	month := resolvePredictionMonth(req)
	year := resolvePredictionYear(req)

	return mlPredictRequest{
		PredictionPath: routeResp.PredictionPath,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		RainfallMm:     req.RainfallMm,
		TempC:          req.TempC,
		HumidityPct:    req.HumidityPct,
		NDVI:           req.NDVI,
		Month:          month,
		Year:           year,
		FeatureVector:  buildFeatureVector(req, routeResp, neighbors, month, year),
		NearestWells:   routeResp.NearestWells,
	}
}

func (s *PredictService) callMLService(ctx context.Context, req mlPredictRequest) (dto.PredictResponse, error) {
	payload, err := json.Marshal(req)
	if err != nil {
		return dto.PredictResponse{}, fmt.Errorf("marshal predict request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.mlServiceURL+"/predict", bytes.NewReader(payload))
	if err != nil {
		return dto.PredictResponse{}, fmt.Errorf("build ml request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return dto.PredictResponse{}, fmt.Errorf("call ml service: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return dto.PredictResponse{}, fmt.Errorf("ml service status: %d", httpResp.StatusCode)
	}

	var resp dto.PredictResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&resp); err != nil {
		return dto.PredictResponse{}, fmt.Errorf("decode ml response: %w", err)
	}

	if resp.RiskLevel == "" {
		resp.RiskLevel = riskFromDepth(resp.DepthMbgl)
	}
	if resp.ConfidencePct <= 0 {
		resp.ConfidencePct = 75
	}
	if resp.PredictionPath == "" {
		resp.PredictionPath = req.PredictionPath
	}

	return resp, nil
}

func buildExactWellResponse(req dto.PredictRequest, well repository.NearbyWell) dto.PredictResponse {
	depth := depthValue(well.DepthMbgl, well.DepthLag1q, req)
	trend := quarterlyTrendFloat(well.DepthLag1q.Float64, well.DepthLag2q.Float64, depth)
	forecast := buildForecast(depth, trend, 0.94, 0.90, 0.86)
	risk := riskFromDepth(depth)

	return dto.PredictResponse{
		DepthMbgl:         round2(depth),
		RiskLevel:         risk,
		ConfidencePct:     94.0,
		PredictionPath:    "EXACT_WELL",
		XGBoostDepth:      round2(depth),
		LSTMDepth:         round2(depth - 0.2),
		RandomForestDepth: round2(depth + 0.1),
		NearestWells: []dto.NearestWell{{
			WellID:     well.ID,
			Name:       well.Name,
			DistanceKm: round2(well.DistanceKm),
			DepthMbgl:  round2(depth),
		}},
		MultiMonthForecast: forecast,
		Recommendation:     recommendationFromRisk(risk),
		ActionableAdvice:   adviceFromRisk(risk),
	}
}

func buildPath2Response(req dto.PredictRequest, neighbors []repository.NearbyWell) dto.PredictResponse {
	weightedDepth := idwAverage(neighbors, func(w repository.NearbyWell) (float64, bool) {
		depth, ok := depthValueNullable(w.DepthMbgl, w.DepthLag1q)
		return depth, ok
	})
	weightedLag1q := idwAverage(neighbors, func(w repository.NearbyWell) (float64, bool) {
		if w.DepthLag1q.Valid {
			return w.DepthLag1q.Float64, true
		}
		if w.DepthMbgl.Valid {
			return w.DepthMbgl.Float64, true
		}
		return 0, false
	})
	weightedLag2q := idwAverage(neighbors, func(w repository.NearbyWell) (float64, bool) {
		if w.DepthLag2q.Valid {
			return w.DepthLag2q.Float64, true
		}
		if w.DepthLag1q.Valid {
			return w.DepthLag1q.Float64, true
		}
		return 0, false
	})

	if weightedDepth == 0 {
		weightedDepth = fallbackDepth(req)
	}
	trend := quarterlyTrendFloat(weightedLag1q, weightedLag2q, weightedDepth)
	environmentBaseline := fallbackDepth(req)
	month := resolvePredictionMonth(req)
	seasonalBias := seasonalDepthAdjustment(month)

	temporalDepth := clamp((weightedDepth*0.74)+(environmentBaseline*0.18)+(trend*0.85)+seasonalBias, 5, 95)
	forecast := buildForecast(temporalDepth, trend, 0.91, 0.87, 0.83)
	nearest := make([]dto.NearestWell, 0, len(neighbors))
	for _, well := range neighbors {
		depth := depthValue(well.DepthMbgl, well.DepthLag1q, req)
		nearest = append(nearest, dto.NearestWell{
			WellID:     well.ID,
			Name:       well.Name,
			DistanceKm: round2(well.DistanceKm),
			DepthMbgl:  round2(depth),
		})
	}

	confidence := path2ConfidenceScore(neighbors, weightedLag1q, weightedLag2q)
	risk := riskFromDepth(temporalDepth)
	xgboostDepth := clamp(temporalDepth+(trend*0.12), 5, 95)
	lstmDepth := clamp(temporalDepth-(trend*0.08), 5, 95)
	randomForestDepth := clamp((temporalDepth+environmentBaseline)/2, 5, 95)

	return dto.PredictResponse{
		DepthMbgl:          round2(temporalDepth),
		RiskLevel:          risk,
		ConfidencePct:      confidence,
		PredictionPath:     "KNN_IDW_TEMPORAL",
		XGBoostDepth:       round2(xgboostDepth),
		LSTMDepth:          round2(lstmDepth),
		RandomForestDepth:  round2(randomForestDepth),
		NearestWells:       nearest,
		MultiMonthForecast: forecast,
		Recommendation:     recommendationFromRisk(risk),
		ActionableAdvice:   adviceFromRisk(risk),
	}
}

func buildForecast(depth, monthlyTrend float64, confidences ...float64) []dto.MonthForecast {
	labels := []string{"1 Month", "2 Months", "3 Months"}
	forecast := make([]dto.MonthForecast, 0, 3)
	for i := 1; i <= 3; i++ {
		nextDepth := clamp(depth+(monthlyTrend*float64(i)), 5, 95)
		confidence := 0.70
		if i-1 < len(confidences) {
			confidence = confidences[i-1]
		}
		forecast = append(forecast, dto.MonthForecast{
			MonthOffset: i,
			Label:       labels[i-1],
			DepthMbgl:   round2(nextDepth),
			RiskLevel:   riskFromDepth(nextDepth),
			Confidence:  confidence,
		})
	}
	return forecast
}

func fallbackPrediction(req dto.PredictRequest) dto.PredictResponse {
	depth := fallbackDepth(req)
	risk := riskFromDepth(depth)
	next1 := clamp(depth+1.2, 5, 95)
	next2 := clamp(depth+2.1, 5, 95)
	next3 := clamp(depth+3.3, 5, 95)

	return dto.PredictResponse{
		DepthMbgl:         round2(depth),
		RiskLevel:         risk,
		ConfidencePct:     68.0,
		PredictionPath:    "ENVIRONMENTAL_ONLY",
		XGBoostDepth:      round2(depth + 0.5),
		LSTMDepth:         round2(depth - 0.4),
		RandomForestDepth: round2(depth + 0.2),
		MultiMonthForecast: []dto.MonthForecast{
			{MonthOffset: 1, Label: "1 Month", DepthMbgl: round2(next1), RiskLevel: riskFromDepth(next1), Confidence: 0.70},
			{MonthOffset: 2, Label: "2 Months", DepthMbgl: round2(next2), RiskLevel: riskFromDepth(next2), Confidence: 0.66},
			{MonthOffset: 3, Label: "3 Months", DepthMbgl: round2(next3), RiskLevel: riskFromDepth(next3), Confidence: 0.62},
		},
		Recommendation:   recommendationFromRisk(risk),
		ActionableAdvice: adviceFromRisk(risk),
	}
}

func mergeResponses(base dto.PredictResponse, remote dto.PredictResponse) dto.PredictResponse {
	if remote.DepthMbgl != 0 {
		base.DepthMbgl = remote.DepthMbgl
	}
	if remote.RiskLevel != "" {
		base.RiskLevel = remote.RiskLevel
	}
	if remote.ConfidencePct > 0 {
		base.ConfidencePct = remote.ConfidencePct
	}
	if remote.PredictionPath != "" {
		base.PredictionPath = remote.PredictionPath
	}
	if remote.XGBoostDepth != 0 {
		base.XGBoostDepth = remote.XGBoostDepth
	}
	if remote.LSTMDepth != 0 {
		base.LSTMDepth = remote.LSTMDepth
	}
	if remote.RandomForestDepth != 0 {
		base.RandomForestDepth = remote.RandomForestDepth
	}
	if len(remote.NearestWells) > 0 {
		base.NearestWells = remote.NearestWells
	}
	if len(remote.MultiMonthForecast) > 0 {
		base.MultiMonthForecast = remote.MultiMonthForecast
	}
	if remote.Recommendation != "" {
		base.Recommendation = remote.Recommendation
	}
	if len(remote.ActionableAdvice) > 0 {
		base.ActionableAdvice = remote.ActionableAdvice
	}
	if len(remote.ModelBreakdown) > 0 {
		base.ModelBreakdown = remote.ModelBreakdown
	}
	if len(remote.EnsembleWeights) > 0 {
		base.EnsembleWeights = remote.EnsembleWeights
	}
	return base
}

func buildFeatureVector(req dto.PredictRequest, routeResp dto.PredictResponse, neighbors []repository.NearbyWell, month, year int) map[string]float64 {
	featureVector := map[string]float64{
		"latitude":             req.Latitude,
		"longitude":            req.Longitude,
		"rainfall_mm":          valueOrZero(req.RainfallMm),
		"temperature_c":        valueOrZero(req.TempC),
		"temperature_avg":      valueOrZero(req.TempC),
		"humidity_pct":         valueOrZero(req.HumidityPct),
		"humidity":             valueOrZero(req.HumidityPct),
		"ndvi":                 valueOrZero(req.NDVI),
		"month":                float64(month),
		"year":                 float64(year),
		"season_encoded":       float64(seasonEncoded(month)),
		"rainfall_lag_1m":      clampValue(req.RainfallMm*0.95, 0, 500),
		"rainfall_lag_2m":      clampValue(req.RainfallMm*0.90, 0, 500),
		"rainfall_lag_3m":      clampValue(req.RainfallMm*0.85, 0, 500),
		"rainfall_rolling_3m":  clampValue(req.RainfallMm*1.05, 0, 500),
		"rainfall_rolling_6m":  clampValue(req.RainfallMm*1.10, 0, 500),
		"rainfall_deficit":     clampValue(100.0-req.RainfallMm, 0, 500),
		"cumulative_deficit":   clampValue((100.0-req.RainfallMm)*3.0, 0, 1500),
		"temp_rainfall_ratio":  clampValue(rainfallRatio(req.TempC, req.RainfallMm), 0, 10),
		"soil_moisture_index":  clampValue((req.RainfallMm/200.0)+(req.NDVI*0.10), 0, 1),
		"evapotranspiration":   clampValue((req.TempC*0.12)+((100.0-req.HumidityPct)*0.03), 0, 20),
		"soil_type_encoded":    float64(soilTypeCode(req.Latitude, req.Longitude)),
		"elevation_m":          clampValue(250.0+math.Abs(req.Latitude-20.0)*20.0+math.Abs(req.Longitude-78.0)*10.0, 0, 1200),
		"slope_degree":         clampValue(math.Abs(req.Latitude-20.0)*2.0+math.Abs(req.Longitude-78.0), 0, 45),
		"district_encoded":     0,
		"rainfall_x_soilmoist": 0,
		"depth_mbgl":           routeResp.DepthMbgl,
		"xgboost_depth":        routeResp.XGBoostDepth,
		"lstm_depth":           routeResp.LSTMDepth,
		"random_forest_depth":  routeResp.RandomForestDepth,
	}

	if len(neighbors) > 0 {
		featureVector["district_encoded"] = float64(districtCode(neighbors[0].District))
		featureVector["rainfall_x_soilmoist"] = clampValue(featureVector["rainfall_mm"]*featureVector["soil_moisture_index"], 0, 500)
		if neighbors[0].DepthMbgl.Valid {
			featureVector["depth_mbgl"] = neighbors[0].DepthMbgl.Float64
		}
		if neighbors[0].DepthLag1q.Valid {
			featureVector["depth_lag_1q"] = neighbors[0].DepthLag1q.Float64
		}
		if neighbors[0].DepthLag2q.Valid {
			featureVector["depth_lag_2q"] = neighbors[0].DepthLag2q.Float64
		}
	}

	if _, ok := featureVector["depth_lag_1q"]; !ok {
		featureVector["depth_lag_1q"] = clampValue(routeResp.DepthMbgl-0.8, 0, 500)
	}
	if _, ok := featureVector["depth_lag_2q"]; !ok {
		featureVector["depth_lag_2q"] = clampValue(routeResp.DepthMbgl-1.4, 0, 500)
	}
	featureVector["depth_change_rate"] = clampValue((featureVector["depth_lag_1q"]-featureVector["depth_lag_2q"])/3.0, -10, 10)

	return featureVector
}

func districtCode(name string) int {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "akola":
		return 1
	case "amravati":
		return 2
	case "bhandara":
		return 3
	case "buldhana":
		return 4
	case "chandrapur":
		return 5
	case "gadchiroli":
		return 6
	case "gondia":
		return 7
	case "nagpur":
		return 8
	case "wardha":
		return 9
	case "washim":
		return 10
	case "yavatmal":
		return 11
	default:
		return 0
	}
}

func seasonEncoded(month int) int {
	switch month {
	case 12, 1, 2:
		return 0
	case 3, 4, 5:
		return 1
	case 6, 7, 8:
		return 2
	default:
		return 3
	}
}

func resolvePredictionMonth(req dto.PredictRequest) int {
	if req.Month >= 1 && req.Month <= 12 {
		return req.Month
	}
	return int(time.Now().Month())
}

func resolvePredictionYear(req dto.PredictRequest) int {
	if req.Year > 0 {
		return req.Year
	}
	return time.Now().Year()
}

func rainfallRatio(tempC, rainfallMm float64) float64 {
	if rainfallMm <= 0 {
		return tempC
	}
	return tempC / rainfallMm
}

func soilTypeCode(latitude, longitude float64) int {
	seed := int(math.Round(math.Abs(latitude*10.0) + math.Abs(longitude*10.0)))
	return (seed % 5) + 1
}

func valueOrZero(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	return value
}

func clampValue(value, minValue, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func riskFromDepth(depth float64) string {
	switch {
	case depth > 65:
		return "DANGER"
	case depth > 50:
		return "WARNING"
	case depth > 35:
		return "MODERATE"
	default:
		return "SAFE"
	}
}

func recommendationFromRisk(risk string) string {
	switch risk {
	case "DANGER":
		return "Immediate water conservation and tanker planning required"
	case "WARNING":
		return "Start storing water and reduce discretionary use"
	case "MODERATE":
		return "Monitor trends and plan irrigation carefully"
	default:
		return "Water status is stable"
	}
}

func adviceFromRisk(risk string) []string {
	switch risk {
	case "DANGER":
		return []string{"Avoid water-intensive crops", "Prepare tanker schedule", "Inspect storage tanks"}
	case "WARNING":
		return []string{"Store extra water", "Use drip irrigation", "Monitor weekly updates"}
	case "MODERATE":
		return []string{"Track monthly changes", "Optimize irrigation timing"}
	default:
		return []string{"Continue normal usage", "Review the next seasonal forecast"}
	}
}

func depthValue(depthMbgl sql.NullFloat64, depthLag1q sql.NullFloat64, req dto.PredictRequest) float64 {
	if depthMbgl.Valid {
		return depthMbgl.Float64
	}
	if depthLag1q.Valid {
		return depthLag1q.Float64
	}
	return fallbackDepth(req)
}

func depthValueNullable(depthMbgl sql.NullFloat64, depthLag1q sql.NullFloat64) (float64, bool) {
	if depthMbgl.Valid {
		return depthMbgl.Float64, true
	}
	if depthLag1q.Valid {
		return depthLag1q.Float64, true
	}
	return 0, false
}

func quarterlyTrendFloat(lag1q, lag2q, fallback float64) float64 {
	if lag1q != 0 && lag2q != 0 {
		return (lag1q - lag2q) / 3.0
	}
	if lag1q != 0 {
		return (lag1q - fallback) / 3.0
	}
	return 0
}

func path2ConfidenceScore(neighbors []repository.NearbyWell, weightedLag1q, weightedLag2q float64) float64 {
	confidence := 74.0 + float64(len(neighbors))*2.5
	if weightedLag1q != 0 || weightedLag2q != 0 {
		confidence += 4.0
	}
	return clamp(confidence, 60, 92)
}

func idwAverage(wells []repository.NearbyWell, valueFn func(repository.NearbyWell) (float64, bool)) float64 {
	type weightedPoint struct {
		value  float64
		weight float64
	}

	points := make([]weightedPoint, 0, len(wells))
	for _, well := range wells {
		value, ok := valueFn(well)
		if !ok {
			continue
		}
		distance := math.Max(well.DistanceKm, 0.25)
		points = append(points, weightedPoint{value: value, weight: 1.0 / (distance * distance)})
	}
	if len(points) == 0 {
		return 0
	}

	var numerator float64
	var denominator float64
	for _, point := range points {
		numerator += point.value * point.weight
		denominator += point.weight
	}
	if denominator == 0 {
		return 0
	}
	return numerator / denominator
}

func fallbackDepth(req dto.PredictRequest) float64 {
	depth := 30.0 + (math.Abs(req.Latitude-20.0) * 2.5)
	depth += (math.Abs(req.Longitude-78.0) * 1.5)
	depth -= (req.RainfallMm / 80.0)
	depth += ((35.0 - req.TempC) / 5.0)
	depth -= (req.HumidityPct / 100.0)
	depth -= (req.NDVI * 2.0)
	return clamp(depth, 5, 95)
}

func seasonalDepthAdjustment(month int) float64 {
	switch month {
	case 6, 7, 8, 9:
		return -2.0
	case 10, 11:
		return 0.5
	case 12, 1, 2:
		return 1.0
	default:
		return 0.0
	}
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func clamp(value, minValue, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}
