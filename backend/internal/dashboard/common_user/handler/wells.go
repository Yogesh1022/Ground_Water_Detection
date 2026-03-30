package handler

import (
	"log"
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
)

func (h *CommonUserHandler) listWells(c *gin.Context) {
	var q dto.WellListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q.PaginationQuery.Normalize()
	cacheKey := buildWellsCacheKey(q)
	var cached dto.WellListResponse
	if hit, err := h.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
		log.Printf("[cache][common] wells get error: %v", err)
	} else if hit {
		setCacheStatusHeader(c, true)
		c.JSON(http.StatusOK, cached)
		return
	}
	setCacheStatusHeader(c, false)

	resp, err := h.wellSvc.List(c.Request.Context(), q)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	if err := h.cache.SetJSON(c.Request.Context(), cacheKey, resp, commonWellsCacheTTL); err != nil {
		log.Printf("[cache][common] wells set error: %v", err)
	}

	c.JSON(http.StatusOK, resp)
}

func (h *CommonUserHandler) getWell(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}

	cacheKey := buildWellDetailCacheKey(id)
	var cached dto.WellDetailResponse
	if hit, err := h.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
		log.Printf("[cache][common] well detail get error: %v", err)
	} else if hit {
		setCacheStatusHeader(c, true)
		c.JSON(http.StatusOK, cached)
		return
	}
	setCacheStatusHeader(c, false)

	resp, err := h.wellSvc.GetDetail(c.Request.Context(), id)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	if err := h.cache.SetJSON(c.Request.Context(), cacheKey, resp, commonWellDetailCacheTTL); err != nil {
		log.Printf("[cache][common] well detail set error: %v", err)
	}

	c.JSON(http.StatusOK, resp)
}

func (h *CommonUserHandler) districtSummary(c *gin.Context) {
	cacheKey := buildDistrictSummaryCacheKey()
	var cached []dto.DistrictStatResponse
	if hit, err := h.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
		log.Printf("[cache][common] district summary get error: %v", err)
	} else if hit {
		setCacheStatusHeader(c, true)
		c.JSON(http.StatusOK, gin.H{"data": cached})
		return
	}
	setCacheStatusHeader(c, false)

	resp, err := h.districtSvc.Summary(c.Request.Context())
	if err != nil {
		handleDomainError(c, err)
		return
	}

	if err := h.cache.SetJSON(c.Request.Context(), cacheKey, resp, commonDistrictSummaryCacheTTL); err != nil {
		log.Printf("[cache][common] district summary set error: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}
