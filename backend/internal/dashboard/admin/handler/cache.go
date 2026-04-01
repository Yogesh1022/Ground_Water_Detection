package handler

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/redis/go-redis/v9"
)

const (
	adminOverviewCacheKey = "admin:overview:v1"
	overviewCacheTTL      = 5 * time.Minute
	usersCacheTTL         = 90 * time.Second
	auditLogCacheTTL      = 45 * time.Second
)

type adminCache struct {
	client *redis.Client
}

func newAdminCache(client *redis.Client) *adminCache {
	return &adminCache{client: client}
}

func (c *adminCache) GetJSON(ctx context.Context, key string, out interface{}) (bool, error) {
	if c == nil || c.client == nil {
		return false, nil
	}

	raw, err := c.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			log.Printf("[cache][admin] miss key=%s", key)
			return false, nil
		}
		return false, err
	}

	if err := json.Unmarshal([]byte(raw), out); err != nil {
		return false, err
	}

	log.Printf("[cache][admin] hit key=%s", key)
	return true, nil
}

func (c *adminCache) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
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

	log.Printf("[cache][admin] set key=%s ttl=%s", key, ttl.String())
	return nil
}

func (c *adminCache) InvalidatePatterns(ctx context.Context, patterns ...string) error {
	if c == nil || c.client == nil {
		return nil
	}

	for _, pattern := range patterns {
		if strings.TrimSpace(pattern) == "" {
			continue
		}

		if err := c.invalidatePattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

func (c *adminCache) invalidatePattern(ctx context.Context, pattern string) error {
	var cursor uint64

	for {
		keys, nextCursor, err := c.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}

		if len(keys) > 0 {
			if err := c.client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
			log.Printf("[cache][admin] invalidated pattern=%s keys=%d", pattern, len(keys))
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}

func buildUsersCacheKey(q dto.ListUsersQuery) string {
	activeVal := "any"
	if q.Active != nil {
		activeVal = fmt.Sprintf("%t", *q.Active)
	}

	raw := fmt.Sprintf(
		"page=%d|limit=%d|role=%s|district=%s|search=%s|active=%s",
		q.Page,
		q.Limit,
		strings.TrimSpace(strings.ToLower(q.Role)),
		strings.TrimSpace(strings.ToLower(q.District)),
		strings.TrimSpace(strings.ToLower(q.Search)),
		activeVal,
	)

	return "admin:users:" + hashKey(raw)
}

func buildAuditLogCacheKey(q dto.AuditLogQuery) string {
	raw := fmt.Sprintf(
		"page=%d|limit=%d|actor_id=%d|action=%s|target_table=%s|start_date=%s|end_date=%s",
		q.Page,
		q.Limit,
		q.ActorID,
		strings.TrimSpace(strings.ToLower(q.Action)),
		strings.TrimSpace(strings.ToLower(q.TargetTable)),
		strings.TrimSpace(q.StartDate),
		strings.TrimSpace(q.EndDate),
	)

	return "admin:audit:" + hashKey(raw)
}

func hashKey(raw string) string {
	sum := sha1.Sum([]byte(raw))
	return hex.EncodeToString(sum[:])
}
