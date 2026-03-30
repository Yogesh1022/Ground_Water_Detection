package handler

import (
	"log"
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
)

func (h *CommonUserHandler) listAlerts(c *gin.Context) {
	var q dto.AlertQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cacheKey := buildAlertsCacheKey(q)
	var cached []dto.AlertResponse
	if hit, err := h.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
		log.Printf("[cache][common] alerts get error: %v", err)
	} else if hit {
		setCacheStatusHeader(c, true)
		c.JSON(http.StatusOK, gin.H{"data": cached})
		return
	}
	setCacheStatusHeader(c, false)

	alerts, err := h.alertSvc.ListActive(c.Request.Context(), q)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	if err := h.cache.SetJSON(c.Request.Context(), cacheKey, alerts, commonAlertsCacheTTL); err != nil {
		log.Printf("[cache][common] alerts set error: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts})
}
