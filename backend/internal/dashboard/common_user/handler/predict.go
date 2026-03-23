package handler

import (
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
)

func (h *CommonUserHandler) predict(c *gin.Context) {
	var req dto.PredictRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.predictSvc.Predict(c.Request.Context(), req)
	if err != nil {
		handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
