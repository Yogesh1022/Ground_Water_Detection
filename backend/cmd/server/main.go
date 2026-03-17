package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/config"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/handler"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/middleware"
	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	logger, err := middleware.NewLogger(cfg.AppEnv)
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	defer func() {
		_ = logger.Sync()
	}()

	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = io.Discard
	gin.DefaultErrorWriter = io.Discard
	gin.DebugPrintRouteFunc = func(string, string, string, int) {}

	logger.Info("[BOOT] config loaded",
		zap.String("app_env", cfg.AppEnv),
		zap.String("server_port", cfg.Server.Port),
		zap.String("postgres_host", cfg.Database.Host),
		zap.Int("postgres_port", cfg.Database.Port),
		zap.String("postgres_db", cfg.Database.Name),
		zap.String("redis_host", cfg.Redis.Host),
		zap.Int("redis_port", cfg.Redis.Port),
	)

	ctx := context.Background()

	dbPool, err := newPostgresPool(ctx, cfg)
	if err != nil {
		logger.Fatal("[DB] postgres connection failed", zap.Error(err))
	}
	defer dbPool.Close()
	logger.Info("[DB] postgres connected",
		zap.String("host", cfg.Database.Host),
		zap.Int("port", cfg.Database.Port),
		zap.String("database", cfg.Database.Name),
		zap.Int32("max_conns", cfg.Database.MaxConns),
	)

	redisClient, err := newRedisClient(ctx, cfg)
	if err != nil {
		logger.Fatal("[CACHE] redis connection failed", zap.Error(err))
	}
	defer func() {
		_ = redisClient.Close()
	}()
	logger.Info("[CACHE] redis connected",
		zap.String("host", cfg.Redis.Host),
		zap.Int("port", cfg.Redis.Port),
		zap.Int("db", cfg.Redis.DB),
	)

	r := gin.New()
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.CORS(cfg.CORS))
	logger.Info("[HTTP] gin initialized", zap.String("mode", gin.Mode()))

	authService := service.NewAuthService(dbPool, cfg.Auth.JWTSecret, cfg.Auth.JWTTTLHours)
	authHandler := handler.NewAuthHandler(authService)
	handler.RegisterRoutes(r, authHandler, cfg.Auth.JWTSecret, dbPool, redisClient)
	logger.Info("[HTTP] routes registered")

	server := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("[HTTP] server starting", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("[HTTP] server start failed", zap.Error(err))
		}
	}()

	waitForShutdown(server, logger)
}

func newPostgresPool(ctx context.Context, cfg config.Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		return nil, err
	}
	poolCfg.MaxConns = cfg.Database.MaxConns

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}

func newRedisClient(ctx context.Context, cfg config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}

func waitForShutdown(server *http.Server, logger *zap.Logger) {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	logger.Info("[HTTP] server shutting down")
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("[HTTP] server shutdown error", zap.Error(err))
	}
}
