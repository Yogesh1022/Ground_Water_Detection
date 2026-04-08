package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/repository"
	adminService "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/service"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RegisterRoutes registers starter endpoints for the admin dashboard.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool, redisClient *redis.Client) {
	userRepo := repository.NewUserRepo(db)
	wellRepo := repository.NewWellRepo(db)
	auditRepo := repository.NewAuditRepo(db)
	settingsRepo := repository.NewSettingsRepo(db)
	modelRepo := repository.NewModelRepo(db)

	userSvc := adminService.NewUserService(userRepo, auditRepo)
	wellSvc := adminService.NewWellService(wellRepo, auditRepo)
	overviewSvc := adminService.NewOverviewService(userRepo, wellRepo, modelRepo)
	settingsSvc := adminService.NewSettingsService(settingsRepo, auditRepo)
	modelSvc := adminService.NewModelService(modelRepo)
	auditSvc := adminService.NewAuditService(auditRepo)
	cache := newAdminCache(redisClient)

	rg.GET("/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"id":    c.GetInt64(middleware.ContextUserIDKey),
			"name":  c.GetString(middleware.ContextNameKey),
			"email": c.GetString(middleware.ContextEmailKey),
			"role":  c.GetString(middleware.ContextRoleKey),
		})
	})

	rg.GET("/overview", func(c *gin.Context) {
		var cached dto.OverviewResponse
		if hit, err := cache.GetJSON(c.Request.Context(), adminOverviewCacheKey, &cached); err != nil {
			log.Printf("[cache][admin] overview get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		overview, err := overviewSvc.GetOverview(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch overview"})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), adminOverviewCacheKey, overview, overviewCacheTTL); err != nil {
			log.Printf("[cache][admin] overview set error: %v", err)
		}

		c.JSON(http.StatusOK, overview)
	})

	rg.GET("/users", func(c *gin.Context) {
		var q dto.ListUsersQuery
		if err := c.ShouldBindQuery(&q); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		q.PaginationQuery.Normalize()

		cacheKey := buildUsersCacheKey(q)
		var cached dto.ListUsersResponse
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][admin] users get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		result, err := userSvc.List(c.Request.Context(), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, result, usersCacheTTL); err != nil {
			log.Printf("[cache][admin] users set error: %v", err)
		}

		c.JSON(http.StatusOK, result)
	})

	rg.GET("/users/:id", func(c *gin.Context) {
		id, ok := parseIDParam(c)
		if !ok {
			return
		}

		user, err := userSvc.GetByID(c.Request.Context(), id)
		if err != nil {
			handleDomainError(c, err)
			return
		}

		c.JSON(http.StatusOK, user)
	})

	rg.POST("/users", func(c *gin.Context) {
		var req dto.CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		created, err := userSvc.Create(c.Request.Context(), req, actorID, actorRole, ip, requestID)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "failed to create user"})
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*", "admin:users:*"); err != nil {
			log.Printf("[cache][admin] invalidate users/create error: %v", err)
		}

		c.JSON(http.StatusCreated, created)
	})

	rg.PUT("/users/:id", func(c *gin.Context) {
		id, ok := parseIDParam(c)
		if !ok {
			return
		}

		var req dto.UpdateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		updated, err := userSvc.Update(c.Request.Context(), id, req, actorID, actorRole, ip, requestID)
		if err != nil {
			handleDomainError(c, err)
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*", "admin:users:*"); err != nil {
			log.Printf("[cache][admin] invalidate users/update error: %v", err)
		}

		c.JSON(http.StatusOK, updated)
	})

	rg.PUT("/users/:id/suspend", func(c *gin.Context) {
		id, ok := parseIDParam(c)
		if !ok {
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		if err := userSvc.Suspend(c.Request.Context(), id, actorID, actorRole, ip, requestID); err != nil {
			handleDomainError(c, err)
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*", "admin:users:*"); err != nil {
			log.Printf("[cache][admin] invalidate users/suspend error: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"message": "user suspended"})
	})

	rg.PUT("/users/:id/activate", func(c *gin.Context) {
		id, ok := parseIDParam(c)
		if !ok {
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		if err := userSvc.Activate(c.Request.Context(), id, actorID, actorRole, ip, requestID); err != nil {
			handleDomainError(c, err)
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*", "admin:users:*"); err != nil {
			log.Printf("[cache][admin] invalidate users/activate error: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"message": "user activated"})
	})

	rg.DELETE("/users/:id", func(c *gin.Context) {
		id, ok := parseIDParam(c)
		if !ok {
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		if err := userSvc.Delete(c.Request.Context(), id, actorID, actorRole, ip, requestID); err != nil {
			handleDomainError(c, err)
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*", "admin:users:*"); err != nil {
			log.Printf("[cache][admin] invalidate users/delete error: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
	})

	rg.GET("/wells", func(c *gin.Context) {
		var q dto.ListWellsQuery
		if err := c.ShouldBindQuery(&q); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		result, err := wellSvc.List(c.Request.Context(), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list wells"})
			return
		}

		c.JSON(http.StatusOK, result)
	})

	rg.POST("/wells", func(c *gin.Context) {
		var req dto.CreateWellRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		created, err := wellSvc.Create(c.Request.Context(), req, actorID, actorRole, ip, requestID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create well"})
			return
		}

		c.JSON(http.StatusCreated, created)
	})

	rg.GET("/settings", func(c *gin.Context) {
		settings, err := settingsSvc.GetAll(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch settings"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": settings})
	})

	rg.PUT("/settings", func(c *gin.Context) {
		var req dto.UpdateSettingsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		actorID, actorRole, ip, requestID := actorContext(c)
		if err := settingsSvc.Update(c.Request.Context(), req, actorID, actorRole, ip, requestID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
			return
		}

		if err := cache.InvalidatePatterns(c.Request.Context(), "admin:overview:*"); err != nil {
			log.Printf("[cache][admin] invalidate settings/update error: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
	})

	rg.GET("/models", func(c *gin.Context) {
		models, err := modelSvc.ListModels(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list models"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": models})
	})

	rg.GET("/data-sources", func(c *gin.Context) {
		sources, err := modelSvc.ListDataSources(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list data sources"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": sources})
	})

	rg.GET("/activity-log", func(c *gin.Context) {
		var q dto.AuditLogQuery
		if err := c.ShouldBindQuery(&q); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		q.PaginationQuery.Normalize()

		cacheKey := buildAuditLogCacheKey(q)
		var cached dto.AuditLogResponse
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][admin] activity-log get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		result, err := auditSvc.List(c.Request.Context(), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list activity log"})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, result, auditLogCacheTTL); err != nil {
			log.Printf("[cache][admin] activity-log set error: %v", err)
		}

		c.JSON(http.StatusOK, result)
	})
}

func parseIDParam(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return 0, false
	}

	return id, true
}

func actorContext(c *gin.Context) (int64, string, string, string) {
	return c.GetInt64(middleware.ContextUserIDKey), c.GetString(middleware.ContextRoleKey), c.ClientIP(), c.GetHeader("X-Request-ID")
}

func handleDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
	case errors.Is(err, adminService.ErrCannotSuspendOwnAccount), errors.Is(err, adminService.ErrCannotDeleteOwnAccount):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

func setCacheStatusHeader(c *gin.Context, hit bool) {
	if hit {
		c.Header("X-Cache-Status", "HIT")
		return
	}

	c.Header("X-Cache-Status", "MISS")
}
