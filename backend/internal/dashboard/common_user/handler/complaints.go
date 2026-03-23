package handler

import (
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
)

func (h *CommonUserHandler) createComplaint(c *gin.Context) {
	var req dto.CreateComplaintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.complaintSvc.Create(c.Request.Context(), req)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *CommonUserHandler) trackComplaint(c *gin.Context) {
	tracking := normalizeTrackingNumber(c.Param("tracking"))
	if tracking == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tracking number"})
		return
	}

	resp, err := h.complaintSvc.Track(c.Request.Context(), tracking)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
