package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/repository"
	commonService "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type CommonUserHandler struct {
	profileSvc   *commonService.ProfileService
	wellSvc      *commonService.WellService
	alertSvc     *commonService.AlertService
	districtSvc  *commonService.DistrictService
	complaintSvc *commonService.ComplaintService
	predictSvc   *commonService.PredictService
	cache        *commonCache
}

func NewCommonUserHandler(db *pgxpool.Pool, redisClient *redis.Client) *CommonUserHandler {
	wellRepo := repository.NewWellRepo(db)
	alertRepo := repository.NewAlertRepo(db)
	complaintRepo := repository.NewComplaintRepo(db)
	predictionRepo := repository.NewPredictionRepo(db)

	return &CommonUserHandler{
		profileSvc:   commonService.NewProfileService(),
		wellSvc:      commonService.NewWellService(wellRepo),
		alertSvc:     commonService.NewAlertService(alertRepo),
		districtSvc:  commonService.NewDistrictService(wellRepo),
		complaintSvc: commonService.NewComplaintService(complaintRepo),
		predictSvc:   commonService.NewPredictService(predictionRepo),
		cache:        newCommonCache(redisClient),
	}
}

func parseIDParam(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return 0, false
	}

	return id, true
}

func handleDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

func normalizeTrackingNumber(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}
