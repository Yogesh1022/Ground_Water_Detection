package handler

import (
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

	resp, err := h.wellSvc.List(c.Request.Context(), q)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *CommonUserHandler) getWell(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}

	resp, err := h.wellSvc.GetDetail(c.Request.Context(), id)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *CommonUserHandler) districtSummary(c *gin.Context) {
	resp, err := h.districtSvc.Summary(c.Request.Context())
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}
