package handler

import (
	"net/http"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/handler"
	commonUserHandler "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/handler"
	govnUserHandler "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/handler"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes wires all shared, auth, and role-scoped routes in one place.
func RegisterRoutes(r *gin.Engine, authHandler *AuthHandler, jwtSecret string) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/api/v1/auth/login", authHandler.Login)

	commonUserGroup := r.Group("/api/v1/common-user")
	commonUserGroup.Use(middleware.Auth(jwtSecret), middleware.RequireRole("citizen"))
	commonUserHandler.RegisterRoutes(commonUserGroup)

	adminGroup := r.Group("/api/v1/admin")
	adminGroup.Use(middleware.Auth(jwtSecret), middleware.RequireRole("admin"))
	handler.RegisterRoutes(adminGroup)

	govnUserGroup := r.Group("/api/v1/govn-user")
	govnUserGroup.Use(middleware.Auth(jwtSecret), middleware.RequireRole("gov"))
	govnUserHandler.RegisterRoutes(govnUserGroup)
}
