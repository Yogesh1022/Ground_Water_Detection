package handler

import (
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

	alerts, err := h.alertSvc.ListActive(c.Request.Context(), q)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts})
}
