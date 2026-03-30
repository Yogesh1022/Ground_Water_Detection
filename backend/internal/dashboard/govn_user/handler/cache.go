package handler

import (
    "context"
    "encoding/json"
    "log"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
)

const (
    govnOverviewCacheTTL   = 2 * time.Minute
    govnAnalyticsCacheTTL  = 2 * time.Minute
    govnForecastCacheTTL   = 3 * time.Minute
    govnCrisisCacheTTL     = 5 * time.Minute
)

type govnCache struct {
    client *redis.Client
}

func newGovnCache(client *redis.Client) *govnCache {
    return &govnCache{client: client}
}

func (c *govnCache) GetJSON(ctx context.Context, key string, out interface{}) (bool, error) {
    if c == nil || c.client == nil {
        return false, nil
    }

    raw, err := c.client.Get(ctx, key).Result()
    if err != nil {
        if err == redis.Nil {
            log.Printf("[cache][govn] miss key=%s", key)
            return false, nil
        }
        return false, err
    }

    if err := json.Unmarshal([]byte(raw), out); err != nil {
        return false, err
    }

    log.Printf("[cache][govn] hit key=%s", key)
    return true, nil
}

func (c *govnCache) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
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

    log.Printf("[cache][govn] set key=%s ttl=%s", key, ttl.String())
    return nil
}

func (c *govnCache) InvalidatePatterns(ctx context.Context, patterns ...string) error {
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

func (c *govnCache) invalidatePattern(ctx context.Context, pattern string) error {
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
            log.Printf("[cache][govn] invalidated pattern=%s keys=%d", pattern, len(keys))
        }

        cursor = nextCursor
        if cursor == 0 {
            break
        }
    }

    return nil
}

func setCacheStatusHeader(c *gin.Context, hit bool) {
    if hit {
        c.Header("X-Cache-Status", "HIT")
        return
    }
    c.Header("X-Cache-Status", "MISS")
}

func buildGovnOverviewCacheKey(district string) string {
    return "govn:overview:" + norm(district)
}

func buildGovnOverviewPattern(district string) string {
    d := norm(district)
    if d == "" {
        return "govn:overview:*"
    }
    return "govn:overview:" + d + "*"
}

func buildGovnAnalyticsCacheKey(district string) string {
    return "govn:analytics:" + norm(district)
}

func buildGovnRainfallCacheKey(district string) string {
    return "govn:rainfall-depth:" + norm(district)
}

func buildGovnDistrictSummaryCacheKey() string {
    return "govn:district-summary:v1"
}

func buildGovnForecastCacheKey(district, horizon string) string {
    return "govn:forecast:" + horizon + ":" + norm(district)
}

func buildGovnShapCacheKey(district string) string {
    return "govn:forecast-shap:" + norm(district)
}

func buildGovnCrisisCacheKey() string {
    return "govn:crisis-zones:v1"
}

func norm(s string) string { return strings.TrimSpace(strings.ToLower(s)) }
*** End Patch