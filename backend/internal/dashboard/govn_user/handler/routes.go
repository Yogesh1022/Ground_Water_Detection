package handler

import (
	"bytes"
	"encoding/csv"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/repository"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/service"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RegisterRoutes wires all gov officer endpoints onto the already-auth-guarded group.
func RegisterRoutes(rg *gin.RouterGroup, db *pgxpool.Pool, redisClient *redis.Client) {
	// Repositories
	complaintRepo := repository.NewComplaintRepo(db)
	districtRepo := repository.NewDistrictRepo(db)
	tankerRepo := repository.NewTankerRepo(db)
	taskRepo := repository.NewTaskRepo(db)
	auditRepo := repository.NewAuditRepo(db)

	// Services
	overviewSvc := service.NewOverviewService(complaintRepo, tankerRepo, taskRepo, districtRepo, auditRepo)
	complaintSvc := service.NewComplaintService(complaintRepo, auditRepo)
	analyticsSvc := service.NewAnalyticsService(districtRepo)
	cache := newGovnCache(redisClient)

	// Helper to get officer's district from context (set by middleware below).
	getDistrict := func(c *gin.Context) string {
		return c.GetString("district")
	}

	// Identity
	rg.GET("/me", func(c *gin.Context) {
		var p dto.ProfileResponse
		userID := c.GetInt64(middleware.ContextUserIDKey)
		db.QueryRow(c.Request.Context(),
			`SELECT id, email, name, role::text, COALESCE(district,''), COALESCE(phone,'')
			 FROM users WHERE id = $1`, userID,
		).Scan(&p.ID, &p.Email, &p.Name, &p.Role, &p.District, &p.Phone)
		c.JSON(http.StatusOK, p)
	})

	// District middleware: attach officer's district to context
	rg.Use(middleware.AttachDistrict(db))

	// Overview
	rg.GET("/overview", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnOverviewCacheKey(district)
		var cached dto.OverviewResponse
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] overview get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		overview, err := overviewSvc.GetOverview(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, overview, govnOverviewCacheTTL); err != nil {
			log.Printf("[cache][govn] overview set error: %v", err)
		}

		c.JSON(http.StatusOK, overview)
	})

	// Complaints
	rg.GET("/requests", func(c *gin.Context) {
		var q dto.ComplaintListQuery
		c.ShouldBindQuery(&q)
		result, err := complaintSvc.List(c.Request.Context(), getDistrict(c), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	})

	rg.GET("/requests/:id", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		comp, err := complaintSvc.Detail(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, comp)
	})

	rg.GET("/requests/:id/history", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		entries, err := auditRepo.ListComplaintHistory(c.Request.Context(), getDistrict(c), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": entries})
	})

	rg.GET("/requests/export", func(c *gin.Context) {
		var q dto.ComplaintListQuery
		c.ShouldBindQuery(&q)
		data, err := complaintSvc.Export(c.Request.Context(), getDistrict(c), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if q.Format == "csv" {
			buf := &bytes.Buffer{}
			w := csv.NewWriter(buf)
			w.Write([]string{"id", "tracking_number", "type", "district", "taluka", "village", "severity", "priority", "status", "assigned_officer_id", "created_at"})
			for _, r := range data {
				w.Write([]string{
					strconv.FormatInt(r.ID, 10), r.TrackingNumber, r.Type, r.District, r.Taluka, r.Village,
					r.Severity, r.Priority, r.Status,
					func() string {
						if r.AssignedOfficerID == nil {
							return ""
						}
						return strconv.FormatInt(*r.AssignedOfficerID, 10)
					}(),
					r.CreatedAt.Format(time.RFC3339),
				})
			}
			w.Flush()
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=complaints.csv")
			c.String(http.StatusOK, buf.String())
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": data})
	})

	rg.PUT("/requests/:id/assign", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var req dto.AssignComplaintRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		if err := complaintSvc.Assign(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate assign error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"message": "complaint assigned"})
	})

	rg.PUT("/requests/:id/resolve", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		req := dto.UpdateComplaintStatusRequest{Status: "resolved"}
		if err := complaintSvc.UpdateStatus(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate resolve error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"message": "complaint resolved"})
	})

	rg.PUT("/requests/:id/escalate", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var req dto.UpdateComplaintStatusRequest
		req.Status = "escalated"
		c.ShouldBindJSON(&req)
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		if err := complaintSvc.UpdateStatus(c.Request.Context(), id, req, actorID, actorRole, c.ClientIP(), c.GetHeader("X-Request-ID")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate escalate error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"message": "complaint escalated"})
	})

	// District Analytics
	rg.GET("/districts/analytics", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnAnalyticsCacheKey(district)
		var cached dto.DistrictAnalyticsResponse
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] analytics get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		analytics, err := analyticsSvc.GetAnalytics(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, analytics, govnAnalyticsCacheTTL); err != nil {
			log.Printf("[cache][govn] analytics set error: %v", err)
		}
		c.JSON(http.StatusOK, analytics)
	})

	rg.GET("/districts/rainfall-depth", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnRainfallCacheKey(district)
		var cached []dto.RainfallDepthPoint
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] rainfall-depth get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, gin.H{"data": cached})
			return
		}
		setCacheStatusHeader(c, false)

		points, err := analyticsSvc.GetRainfallVsDepth(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, points, govnAnalyticsCacheTTL); err != nil {
			log.Printf("[cache][govn] rainfall-depth set error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"data": points})
	})

	rg.GET("/districts/summary", func(c *gin.Context) {
		cacheKey := buildGovnDistrictSummaryCacheKey()
		var cached []dto.DistrictSummaryRow
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] district summary get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, gin.H{"data": cached})
			return
		}
		setCacheStatusHeader(c, false)

		rows, err := analyticsSvc.GetDistrictSummary(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, rows, govnAnalyticsCacheTTL); err != nil {
			log.Printf("[cache][govn] district summary set error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"data": rows})
	})

	rg.GET("/forecast", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnForecastCacheKey(district, "short")
		var cached dto.ForecastResponse
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] forecast get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, cached)
			return
		}
		setCacheStatusHeader(c, false)

		forecast, err := analyticsSvc.GetForecast(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, forecast, govnForecastCacheTTL); err != nil {
			log.Printf("[cache][govn] forecast set error: %v", err)
		}
		c.JSON(http.StatusOK, forecast)
	})

	rg.GET("/forecast/long", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnForecastCacheKey(district, "long")
		var cached []dto.Forecast90DayPoint
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] forecast/long get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, gin.H{"data": cached})
			return
		}
		setCacheStatusHeader(c, false)

		forecast, err := analyticsSvc.GetForecast90(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, forecast, govnForecastCacheTTL); err != nil {
			log.Printf("[cache][govn] forecast/long set error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"data": forecast})
	})

	rg.GET("/forecast/shap", func(c *gin.Context) {
		district := getDistrict(c)
		cacheKey := buildGovnShapCacheKey(district)
		var cached []dto.ShapFeature
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] forecast/shap get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, gin.H{"data": cached})
			return
		}
		setCacheStatusHeader(c, false)

		shap, err := analyticsSvc.GetShapFeatures(c.Request.Context(), district)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, shap, govnForecastCacheTTL); err != nil {
			log.Printf("[cache][govn] forecast/shap set error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"data": shap})
	})

	rg.GET("/crisis-zones", func(c *gin.Context) {
		cacheKey := buildGovnCrisisCacheKey()
		var cached []dto.CrisisZone
		if hit, err := cache.GetJSON(c.Request.Context(), cacheKey, &cached); err != nil {
			log.Printf("[cache][govn] crisis-zones get error: %v", err)
		} else if hit {
			setCacheStatusHeader(c, true)
			c.JSON(http.StatusOK, gin.H{"data": cached})
			return
		}
		setCacheStatusHeader(c, false)

		zones, err := analyticsSvc.GetCrisisZones(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := cache.SetJSON(c.Request.Context(), cacheKey, zones, govnCrisisCacheTTL); err != nil {
			log.Printf("[cache][govn] crisis-zones set error: %v", err)
		}
		c.JSON(http.StatusOK, gin.H{"data": zones})
	})

	// Tanker Routes
	rg.GET("/tankers", func(c *gin.Context) {
		tankers, err := tankerRepo.ListByDistrict(c.Request.Context(), getDistrict(c))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": tankers})
	})

	rg.POST("/tankers", func(c *gin.Context) {
		var req dto.CreateTankerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		tanker, err := tankerRepo.Create(c.Request.Context(), getDistrict(c), actorID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "CREATE_TANKER_ROUTE", "tanker_routes",
			tanker.ID, map[string]interface{}{"route": tanker.RouteName}, c.ClientIP(), c.GetHeader("X-Request-ID"))
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate tanker create error: %v", err)
		}
		c.JSON(http.StatusCreated, tanker)
	})

	rg.PATCH("/tankers/:id", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var req dto.UpdateTankerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := tankerRepo.Update(c.Request.Context(), id, req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate tanker update error: %v", err)
		}
		c.Status(http.StatusNoContent)
	})

	// Tasks
	rg.POST("/tasks", func(c *gin.Context) {
		var req dto.CreateTaskRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		task, err := taskRepo.Create(c.Request.Context(), actorID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "CREATE_TASK", "task_assignments",
			task.ID, map[string]interface{}{"complaint_id": req.ComplaintID, "assignee": req.AssigneeOfficerID},
			c.ClientIP(), c.GetHeader("X-Request-ID"))
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate task create error: %v", err)
		}
		c.JSON(http.StatusCreated, task)
	})

	rg.PATCH("/tasks/:id", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var req dto.UpdateTaskRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := taskRepo.UpdateStatus(c.Request.Context(), id, req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		task, _ := taskRepo.GetByID(c.Request.Context(), id)
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate task update error: %v", err)
		}
		c.JSON(http.StatusOK, task)
	})

	rg.PATCH("/tasks/:id/reassign", func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var req dto.ReassignTaskRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actorID := c.GetInt64(middleware.ContextUserIDKey)
		actorRole := c.GetString(middleware.ContextRoleKey)
		if err := taskRepo.Reassign(c.Request.Context(), id, req.AssigneeOfficerID, req.Notes); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		auditRepo.WriteLog(c.Request.Context(), actorID, actorRole, "REASSIGN_TASK", "task_assignments", id,
			map[string]interface{}{"assignee": req.AssigneeOfficerID}, c.ClientIP(), c.GetHeader("X-Request-ID"))
		task, _ := taskRepo.GetByID(c.Request.Context(), id)
		if err := cache.InvalidatePatterns(c.Request.Context(), buildGovnOverviewPattern(getDistrict(c))); err != nil {
			log.Printf("[cache][govn] invalidate task reassign error: %v", err)
		}
		c.JSON(http.StatusOK, task)
	})

	rg.GET("/tasks", func(c *gin.Context) {
		var q dto.PaginationQuery
		c.ShouldBindQuery(&q)
		tasks, total, err := taskRepo.ListByDistrict(c.Request.Context(), getDistrict(c), q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		pages := int(math.Ceil(float64(total) / float64(q.Limit)))
		c.JSON(http.StatusOK, dto.TaskListResponse{Data: tasks, Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages}})
	})

	rg.GET("/teams/workload", func(c *gin.Context) {
		workload, err := taskRepo.GetWorkload(c.Request.Context(), getDistrict(c))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": workload})
	})

	// Activity Log
	rg.GET("/activity-log", func(c *gin.Context) {
		var q dto.ActivityLogQuery
		c.ShouldBindQuery(&q)
		district := getDistrict(c)
		entries, total, err := auditRepo.ListByDistrict(c.Request.Context(), district, q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		pages := int(math.Ceil(float64(total) / float64(q.Limit)))
		c.JSON(http.StatusOK, dto.ActivityLogResponse{
			Data: entries,
			Meta: dto.PagedMeta{Page: q.Page, Limit: q.Limit, TotalItems: total, TotalPages: pages},
		})
	})

	// Reports (simple synchronous job stub)
	rg.POST("/reports/generate", func(c *gin.Context) {
		var payload struct {
			ReportType string `json:"report_type" binding:"required"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		job := dto.ReportJobResponse{
			JobID:      "job-" + strconv.FormatInt(time.Now().Unix(), 10),
			Status:     "completed",
			FileURL:    "/reports/" + payload.ReportType + "/" + getDistrict(c) + ".pdf",
			Message:    "Report generated",
			ReportType: payload.ReportType,
		}
		c.JSON(http.StatusOK, job)
	})
}
