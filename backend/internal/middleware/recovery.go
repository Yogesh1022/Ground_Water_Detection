package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		requestID := c.GetString(ContextRequestIDKey)
		fields := []zap.Field{
			zap.Any("error", recovered),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("ip", c.ClientIP()),
			zap.ByteString("stack", debug.Stack()),
		}
		if requestID != "" {
			fields = append(fields, zap.String("request_id", requestID))
		}
		if userID := c.GetInt64(ContextUserIDKey); userID > 0 {
			fields = append(fields, zap.Int64("user_id", userID))
		}
		logger.Error("[PANIC] recovered", fields...)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
	})
}
