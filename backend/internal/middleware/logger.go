package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const ContextRequestIDKey = "request_id"

func NewLogger(appEnv string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	if appEnv == "development" {
		cfg = zap.NewDevelopmentConfig()
		cfg.Encoding = "console"
		cfg.EncoderConfig.TimeKey = "time"
		cfg.EncoderConfig.LevelKey = "level"
		cfg.EncoderConfig.MessageKey = "msg"
		cfg.EncoderConfig.CallerKey = "src"
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		cfg.EncoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
		cfg.EncoderConfig.EncodeDuration = zapcore.StringDurationEncoder
		cfg.DisableStacktrace = true
		cfg.DisableCaller = true
	}

	if appEnv != "development" {
		cfg.EncoderConfig.TimeKey = "ts"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}
	if appEnv == "development" {
		cfg.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("15:04:05")
	}

	return cfg.Build()
}

func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = newRequestID()
		}
		c.Set(ContextRequestIDKey, requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		c.Next()

		latency := time.Since(start)
		if query != "" {
			path = path + "?" + query
		}
		message := fmt.Sprintf("[HTTP] %s %s", c.Request.Method, path)

		fields := []zap.Field{
			zap.Int("status", c.Writer.Status()),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("rid", requestID),
		}

		if userID := c.GetInt64(ContextUserIDKey); userID > 0 {
			fields = append(fields, zap.Int64("user_id", userID))
		}
		if role := c.GetString(ContextRoleKey); role != "" {
			fields = append(fields, zap.String("role", role))
		}
		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("errors", c.Errors.String()))
		}
		if c.Writer.Status() >= 400 {
			fields = append(fields,
				zap.String("ua", c.Request.UserAgent()),
				zap.Int("bytes", c.Writer.Size()),
			)
		}

		switch {
		case c.Writer.Status() >= 500:
			logger.Error(message, fields...)
		case c.Writer.Status() >= 400:
			logger.Warn(message, fields...)
		default:
			logger.Info(message, fields...)
		}
	}
}

func newRequestID() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(buf)
}
