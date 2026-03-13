package handler

import (
	"net/http"

	"aquavidarbha/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers starter endpoints for the admin dashboard.
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
