package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type windowCounter struct {
	windowStart time.Time
	count       int
}

// RateLimit 按客户端 IP 做固定窗口限流。公开写接口用，避免绕过 Next 层内存限流。
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	buckets := map[string]*windowCounter{}

	return func(c *gin.Context) {
		now := time.Now()
		ip := c.ClientIP()

		mu.Lock()
		if len(buckets) > 10000 {
			for key, bucket := range buckets {
				if now.Sub(bucket.windowStart) >= window {
					delete(buckets, key)
				}
			}
		}

		bucket := buckets[ip]
		if bucket == nil || now.Sub(bucket.windowStart) >= window {
			buckets[ip] = &windowCounter{windowStart: now, count: 1}
			mu.Unlock()
			c.Next()
			return
		}
		if bucket.count >= max {
			retryAfter := int((window - now.Sub(bucket.windowStart)).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			mu.Unlock()
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "请求过于频繁，请稍后再试",
			})
			return
		}
		bucket.count++
		mu.Unlock()
		c.Next()
	}
}
