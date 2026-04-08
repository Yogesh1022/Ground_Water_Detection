package handler

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	commonWellsCacheTTL           = 2 * time.Minute
	commonWellDetailCacheTTL      = 2 * time.Minute
	commonDistrictSummaryCacheTTL = 3 * time.Minute
	commonAlertsCacheTTL          = 1 * time.Minute
)

type commonCache struct {
	client *redis.Client
}

func newCommonCache(client *redis.Client) *commonCache {
	return &commonCache{client: client}
}

func (c *commonCache) GetJSON(ctx context.Context, key string, out interface{}) (bool, error) {
	if c == nil || c.client == nil {
		return false, nil
	}

	raw, err := c.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			log.Printf("[cache][common] miss key=%s", key)
			return false, nil
		}
		return false, err
	}

	if err := json.Unmarshal([]byte(raw), out); err != nil {
		return false, err
	}

	log.Printf("[cache][common] hit key=%s", key)
	return true, nil
}

func (c *commonCache) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if c == nil || c.client == nil {
		return nil
	}

	body, err := json.Marshal(value)
	if err != nil {
		return err
	}

	if err := c.client.Set(ctx, key, body, ttl).Err(); err != nil {
		return err
	}

	log.Printf("[cache][common] set key=%s ttl=%s", key, ttl.String())
	return nil
}

func setCacheStatusHeader(c *gin.Context, hit bool) {
	if hit {
		c.Header("X-Cache-Status", "HIT")
		return
	}
	c.Header("X-Cache-Status", "MISS")
}

func buildWellsCacheKey(q dto.WellListQuery) string {
	return "common:wells:" + hashKey(strings.Join([]string{
		"page=" + intToString(q.Page),
		"limit=" + intToString(q.Limit),
		"district=" + norm(q.District),
	}, "|"))
}

func buildWellDetailCacheKey(id int64) string {
	return "common:well:" + int64ToString(id)
}

func buildDistrictSummaryCacheKey() string {
	return "common:district-summary:v1"
}

func buildAlertsCacheKey(q dto.AlertQuery) string {
	return "common:alerts:" + hashKey(strings.Join([]string{
		"district=" + norm(q.District),
		"type=" + norm(q.Type),
	}, "|"))
}

func hashKey(raw string) string {
	sum := sha1.Sum([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func norm(s string) string { return strings.TrimSpace(strings.ToLower(s)) }

func intToString(v int) string { return strconv.Itoa(v) }

func int64ToString(v int64) string { return strconv.FormatInt(v, 10) }
