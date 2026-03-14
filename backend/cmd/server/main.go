package main

import (
	"context"
	"fmt"
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

	ctx := context.Background()

	dbPool, err := newPostgresPool(ctx, cfg)
	if err != nil {
		logger.Fatal("failed to connect postgres", zap.Error(err))
	}
	defer dbPool.Close()

	redisClient, err := newRedisClient(ctx, cfg)
	if err != nil {
		logger.Fatal("failed to connect redis", zap.Error(err))
	}
	defer func() {
		_ = redisClient.Close()
	}()

	r := gin.New()
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.CORS(cfg.CORS))

	authService := service.NewAuthService(dbPool, cfg.Auth.JWTSecret, cfg.Auth.JWTTTLHours)
	authHandler := handler.NewAuthHandler(authService)
	handler.RegisterRoutes(r, authHandler, cfg.Auth.JWTSecret)

	server := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("server_starting", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server_start_failed", zap.Error(err))
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

	logger.Info("server_shutting_down")
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server_shutdown_error", zap.Error(err))
	}
}
