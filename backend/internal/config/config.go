package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv   string
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Auth     AuthConfig
	CORS     CORSConfig
}

type ServerConfig struct {
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
	MaxConns int32
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type AuthConfig struct {
	JWTSecret   string
	JWTTTLHours int
}

type CORSConfig struct {
	AllowOrigins     []string
	AllowMethods     []string
	AllowHeaders     []string
	AllowCredentials bool
}

func Load() (Config, error) {
	// Best-effort load for local development; OS env vars still take precedence.
	_ = godotenv.Load(".env", ".env.local", ".env.example")

	cfg := Config{
		AppEnv: getEnv("APP_ENV", "development"),
		Server: ServerConfig{
			Port: getEnv("APP_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnvAsInt("POSTGRES_PORT", 5432),
			User:     getEnv("POSTGRES_USER", "postgres"),
			Password: getEnv("POSTGRES_PASSWORD", "postgres"),
			Name:     getEnv("POSTGRES_DB", "aquavidarbha"),
			SSLMode:  getEnv("POSTGRES_SSLMODE", "disable"),
			MaxConns: int32(getEnvAsInt("POSTGRES_MAX_CONNS", 10)),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvAsInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
		},
		Auth: AuthConfig{
			JWTSecret:   getEnv("JWT_SECRET", ""),
			JWTTTLHours: getEnvAsInt("JWT_TTL_HOURS", 24),
		},
		CORS: CORSConfig{
			AllowOrigins:     splitCSV(getEnv("CORS_ALLOW_ORIGINS", "*")),
			AllowMethods:     splitCSV(getEnv("CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS")),
			AllowHeaders:     splitCSV(getEnv("CORS_ALLOW_HEADERS", "Authorization,Content-Type,X-Request-ID")),
			AllowCredentials: getEnvAsBool("CORS_ALLOW_CREDENTIALS", true),
		},
	}

	if cfg.Server.Port == "" {
		return Config{}, fmt.Errorf("APP_PORT cannot be empty")
	}

	if len(cfg.Auth.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}

	if cfg.Auth.JWTTTLHours <= 0 {
		return Config{}, fmt.Errorf("JWT_TTL_HOURS must be positive")
	}

	return cfg, nil
}

func (c DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host,
		c.Port,
		c.User,
		c.Password,
		c.Name,
		c.SSLMode,
	)
}

func getEnv(key, fallback string) string {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	return value
}

func getEnvAsInt(key string, fallback int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return fallback
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return fallback
	}
	return value
}

func getEnvAsBool(key string, fallback bool) bool {
	valueStr := strings.TrimSpace(strings.ToLower(getEnv(key, "")))
	if valueStr == "" {
		return fallback
	}
	return valueStr == "1" || valueStr == "true" || valueStr == "yes"
}

func splitCSV(input string) []string {
	parts := strings.Split(input, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			out = append(out, item)
		}
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	return out
}
