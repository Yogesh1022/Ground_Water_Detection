package middleware

import (
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/config"
	"github.com/gin-gonic/gin"
)

func CORS(corsCfg config.CORSConfig) gin.HandlerFunc {
	originSet := map[string]struct{}{}
	for _, origin := range corsCfg.AllowOrigins {
		originSet[origin] = struct{}{}
	}

	loopbackSchemes := allowedLoopbackSchemes(corsCfg.AllowOrigins)

	methods := strings.Join(corsCfg.AllowMethods, ",")
	headers := strings.Join(corsCfg.AllowHeaders, ",")

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if isAllowedOrigin(origin, originSet, loopbackSchemes) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			if corsCfg.AllowCredentials {
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			// Reflect requested headers when present (prevents local dev CORS failures when
			// clients add extra headers like X-Requested-With).
			if reqHeaders := strings.TrimSpace(c.GetHeader("Access-Control-Request-Headers")); reqHeaders != "" {
				c.Writer.Header().Set("Access-Control-Allow-Headers", reqHeaders)
			} else {
				c.Writer.Header().Set("Access-Control-Allow-Headers", headers)
			}

			// Always advertise allowed methods.
			c.Writer.Header().Set("Access-Control-Allow-Methods", methods)

			// Cache preflight results for a bit to reduce OPTIONS spam.
			c.Writer.Header().Set("Access-Control-Max-Age", "600")
		}

		// Help caches/CDNs differentiate by origin and requested headers.
		c.Writer.Header().Add("Vary", "Origin")
		c.Writer.Header().Add("Vary", "Access-Control-Request-Method")
		c.Writer.Header().Add("Vary", "Access-Control-Request-Headers")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func isAllowedOrigin(origin string, originSet map[string]struct{}, loopbackSchemes map[string]struct{}) bool {
	if origin == "" {
		return false
	}
	if _, ok := originSet["*"]; ok {
		return true
	}
	if _, ok := originSet[origin]; ok {
		return true
	}

	// Local development convenience:
	// If loopback is allowed at all for a scheme (e.g. http), allow ANY loopback host and port.
	if len(loopbackSchemes) > 0 {
		u, err := url.Parse(origin)
		if err == nil && u.Scheme != "" {
			hostname := strings.ToLower(u.Hostname())
			if isLoopbackHost(hostname) {
				if _, ok := loopbackSchemes[u.Scheme]; ok {
					return true
				}
			}
		}
	}

	// Local development convenience:
	// Treat localhost/127.0.0.1/::1 as equivalent loopback origins.
	for _, alt := range loopbackOriginAlternatives(origin) {
		if _, ok := originSet[alt]; ok {
			return true
		}
	}

	return false
}

func allowedLoopbackSchemes(allowedOrigins []string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, raw := range allowedOrigins {
		u, err := url.Parse(strings.TrimSpace(raw))
		if err != nil || u.Scheme == "" {
			continue
		}
		hostname := strings.ToLower(u.Hostname())
		if isLoopbackHost(hostname) {
			out[u.Scheme] = struct{}{}
		}
	}
	return out
}

func isLoopbackHost(hostname string) bool {
	if hostname == "localhost" {
		return true
	}
	if ip := net.ParseIP(hostname); ip != nil {
		return ip.IsLoopback()
	}
	return hostname == "127.0.0.1" || hostname == "::1"
}

func loopbackOriginAlternatives(origin string) []string {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" {
		return nil
	}

	hostname := strings.ToLower(u.Hostname())
	port := u.Port()

	// Only generate alternatives for loopback hosts.
	if hostname != "localhost" && hostname != "127.0.0.1" && hostname != "::1" {
		return nil
	}

	variants := []string{"localhost", "127.0.0.1", "::1"}
	out := make([]string, 0, len(variants)-1)
	for _, v := range variants {
		if v == hostname {
			continue
		}
		host := v
		if port != "" {
			host = net.JoinHostPort(v, port)
		}
		out = append(out, u.Scheme+"://"+host)
	}

	return out
}
