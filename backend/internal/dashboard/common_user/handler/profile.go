package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *CommonUserHandler) getProfile(c *gin.Context) {
	c.JSON(http.StatusOK, h.profileSvc.PublicProfile())
}
