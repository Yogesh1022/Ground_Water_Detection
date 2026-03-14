package middleware

import (
	"net/http"
	"strings"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/config"
	"github.com/gin-gonic/gin"
)

func CORS(corsCfg config.CORSConfig) gin.HandlerFunc {
	originSet := map[string]struct{}{}
	for _, origin := range corsCfg.AllowOrigins {
		originSet[origin] = struct{}{}
	}

	methods := strings.Join(corsCfg.AllowMethods, ",")
	headers := strings.Join(corsCfg.AllowHeaders, ",")

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if isAllowedOrigin(origin, originSet) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			if corsCfg.AllowCredentials {
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			}
		}

		c.Writer.Header().Set("Vary", "Origin")
		c.Writer.Header().Set("Access-Control-Allow-Methods", methods)
		c.Writer.Header().Set("Access-Control-Allow-Headers", headers)

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func isAllowedOrigin(origin string, originSet map[string]struct{}) bool {
	if origin == "" {
		return false
	}
	if _, ok := originSet["*"]; ok {
		return true
	}
	_, ok := originSet[origin]
	return ok
}
