package handler

import "github.com/gin-gonic/gin"

// OK wraps a success payload with a consistent envelope.
func OK(c *gin.Context, data interface{}) {
	c.JSON(200, gin.H{"data": data})
}

// Error wraps an error message with a consistent envelope.
func Error(c *gin.Context, status int, msg string) {
	c.JSON(status, gin.H{"error": msg})
}
