package handler

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
)

const (
	groundwaterReadingsCacheTTL = 5 * 60 // 5 minutes
)

func (h *CommonUserHandler) listGroundwaterReadings(c *gin.Context) {
	var q dto.GroundwaterReadingQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q.PaginationQuery.Normalize()
	cacheKey := buildGroundwaterCacheKey(q)
	var cached dto.GroundwaterReadingListResponse
	if hit, err := h.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
		log.Printf("[cache][common] groundwater readings get error: %v", err)
	} else if hit {
		setCacheStatusHeader(c, true)
		c.JSON(http.StatusOK, cached)
		return
	}
	setCacheStatusHeader(c, false)

	resp, err := h.groundwaterReadingSvc.ListReadings(c.Request.Context(), q)
	if err != nil {
		log.Printf("[error] list groundwater readings: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list groundwater readings"})
		return
	}

	if err := h.cache.SetJSON(c.Request.Context(), cacheKey, resp, groundwaterReadingsCacheTTL); err != nil {
		log.Printf("[cache][common] groundwater readings set error: %v", err)
	}

	c.JSON(http.StatusOK, resp)
}

func buildGroundwaterCacheKey(q dto.GroundwaterReadingQuery) string {
	return fmt.Sprintf("common:groundwater:%s:%s:%s:%s:%s:%d:%d",
		q.District, q.StartDate, q.EndDate, q.SortBy, q.SortOrder, q.Page, q.Limit)
}
