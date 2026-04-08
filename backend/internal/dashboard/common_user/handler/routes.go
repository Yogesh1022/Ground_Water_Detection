package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RegisterRoutes registers common user endpoints.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool, redisClient *redis.Client) {
	h := NewCommonUserHandler(db, redisClient)

	rg.GET("/me", h.getProfile)
	rg.GET("/wells", h.listWells)
	rg.GET("/wells/:id", h.getWell)
	rg.GET("/districts/summary", h.districtSummary)
	rg.GET("/alerts", h.listAlerts)
	rg.GET("/groundwater-readings", h.listGroundwaterReadings)
	rg.POST("/predict", h.predict)
	rg.POST("/complaints", h.createComplaint)
	rg.GET("/complaints/track/:tracking", h.trackComplaint)
}
