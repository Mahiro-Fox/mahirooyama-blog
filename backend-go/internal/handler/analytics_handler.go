package handler

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// maxAnalyticsBody 埋点请求体上限（64KB，防御超大 payload）
const maxAnalyticsBody = 64 << 10

// analyticsBody 客户端上报的埋点字段
type analyticsBody struct {
	Event      string         `json:"event"`
	URL        string         `json:"url"`
	Referrer   string         `json:"referrer"`
	Screen     string         `json:"screen"`
	Properties map[string]any `json:"properties"`
	Timestamp  string         `json:"timestamp"`
}

// CreateAnalyticsHandler POST /api/analytics（前端埋点，公开入口）
// 包含：body 大小限制 + IP 维度限流 + IP 掩码 / UA / 地理位置解析 + 落库
func CreateAnalyticsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 限制请求体大小（超限时 ShouldBindJSON 会返回错误）
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxAnalyticsBody)

		var body analyticsBody
		if err := c.ShouldBindJSON(&body); err != nil {
			var maxErr *http.MaxBytesError
			if errors.As(err, &maxErr) {
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{"success": false, "message": "请求体过大"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "请求参数无效"})
			return
		}

		// 2. 按 IP 维度限流
		ip := c.ClientIP()
		if !service.AllowAnalyticsEvent(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "请求过于频繁，请稍后再试"})
			return
		}

		// 3. 解析时间戳（非法则使用服务端时间）
		var ts time.Time
		if body.Timestamp != "" {
			if parsed, err := time.Parse(time.RFC3339, body.Timestamp); err == nil {
				ts = parsed
			}
		}

		// 4. 组装并落库（IP 掩码 / UA / 地理位置在 service 内处理）
		input := service.AnalyticsInput{
			Event:      body.Event,
			URL:        body.URL,
			Referrer:   body.Referrer,
			Screen:     body.Screen,
			Properties: body.Properties,
			Timestamp:  ts,
			RawIP:      ip,
			UserAgent:  c.GetHeader("User-Agent"),
		}
		if err := service.CreateAnalyticsLog(c.Request.Context(), store, input); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "处理埋点请求失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "埋点数据接收成功"})
	}
}

// GetAnalyticsLogsHandler GET /api/admin/analytics（后台读取最近日志 + 统计）
func GetAnalyticsLogsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		logs, stats, err := service.GetAnalyticsSummary(c.Request.Context(), store, service.AnalyticsRetention)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "读取日志失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"logs": logs, "stats": stats})
	}
}

// DeleteExpiredAnalyticsHandler DELETE /api/admin/analytics（后台删除过期日志）
func DeleteExpiredAnalyticsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		deleted, err := service.DeleteExpiredAnalyticsLogs(c.Request.Context(), store, service.AnalyticsRetention)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "删除过期日志失败"})
			return
		}
		// 库表无“文件”概念：仅用 0/1 表达是否存在过期数据，兼容原前端展示
		deletedFiles := 0
		if deleted > 0 {
			deletedFiles = 1
		}
		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"message":      fmt.Sprintf("成功删除 %d 条过期记录", deleted),
			"deletedLogs":  deleted,
			"deletedFiles": deletedFiles,
		})
	}
}