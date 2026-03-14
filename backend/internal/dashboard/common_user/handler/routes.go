package handler

import (
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers starter endpoints for the common user dashboard.
func RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"id":    c.GetInt64(middleware.ContextUserIDKey),
			"name":  c.GetString(middleware.ContextNameKey),
			"email": c.GetString(middleware.ContextEmailKey),
			"role":  c.GetString(middleware.ContextRoleKey),
		})
	})
}
