package handler

import (
	"net/http"

	"aquavidarbha/backend/internal/dashboard/admin/handler"
	commonUserHandler "aquavidarbha/backend/internal/dashboard/common_user/handler"
	govnUserHandler "aquavidarbha/backend/internal/dashboard/govn_user/handler"
	"aquavidarbha/backend/internal/middleware"
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
