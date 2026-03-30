package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AttachDistrict loads the user's district from DB and sets it on context.
func AttachDistrict(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(ContextUserIDKey)
		var district string
		db.QueryRow(c.Request.Context(), `SELECT COALESCE(district,'') FROM users WHERE id = $1`, userID).Scan(&district)
		c.Set("district", district)
		c.Next()
	}
}
