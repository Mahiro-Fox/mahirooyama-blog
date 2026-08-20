package service

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ============================================================
// 埋点写入限流（进程内，按 IP 维度，窗口期 1 分钟）
// 防御高频 POST /api/analytics 灌库。
// ============================================================

const (
	analyticsRateWindow = time.Minute
	analyticsRateMax    = 60
)

// analyticsRateEntry 单 IP 在窗口内的计数
type analyticsRateEntry struct {
	count   int
	resetAt time.Time
}

var analyticsRateState = struct {
	mu sync.Mutex
	m  map[string]analyticsRateEntry
}{m: map[string]analyticsRateEntry{}}

// AllowAnalyticsEvent 判断给定 IP 是否允许继续写入埋点（窗口内超限返回 false）
func AllowAnalyticsEvent(ip string) bool {
	analyticsRateState.mu.Lock()
	defer analyticsRateState.mu.Unlock()

	now := time.Now()
	e, ok := analyticsRateState.m[ip]
	if !ok || now.After(e.resetAt) {
		analyticsRateState.m[ip] = analyticsRateEntry{count: 1, resetAt: now.Add(analyticsRateWindow)}
		return true
	}
	if e.count >= analyticsRateMax {
		return false
	}
	e.count++
	analyticsRateState.m[ip] = e
	return true
}

// ============================================================
// IP 处理：判定公网 + 掩码（脱敏）
// ============================================================

// isPublicIP 判断是否公网 IP（排除回环 / 私网 / 链路本地等）
func isPublicIP(ipStr string) bool {
	ip := net.ParseIP(strings.TrimPrefix(ipStr, "::ffff:"))
	if ip == nil {
		return false
	}
	return ip.IsGlobalUnicast() && !ip.IsPrivate() && !ip.IsLoopback() &&
		!ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast() && !ip.IsMulticast()
}

// maskIP 对 IPv4 掩去最后一组，其余原样返回（含 ::ffff: 前缀剥离）
func maskIP(ipStr string) string {
	clean := strings.TrimPrefix(ipStr, "::ffff:")
	if clean == "" {
		return "unknown"
	}
	parts := strings.Split(clean, ".")
	if len(parts) == 4 {
		parts[3] = "*"
		return strings.Join(parts, ".")
	}
	return clean
}

// ============================================================
// UA 解析（轻量实现，覆盖常见浏览器 / 系统 / 移动端判断）
// ============================================================

func parseDevice(ua string) model.AnalyticsDevice {
	if ua == "" {
		return model.AnalyticsDevice{Browser: "unknown", OS: "unknown", IsMobile: false}
	}
	lower := strings.ToLower(ua)
	device := model.AnalyticsDevice{
		IsMobile: strings.Contains(lower, "mobile") ||
			(strings.Contains(lower, "android") && !strings.Contains(lower, "android tv")) ||
			strings.Contains(lower, "iphone") ||
			strings.Contains(lower, "ipad"),
	}

	switch {
	case strings.Contains(lower, "edg/"):
		device.Browser = "Edge"
	case strings.Contains(lower, "chrome"):
		device.Browser = "Chrome"
	case strings.Contains(lower, "firefox"):
		device.Browser = "Firefox"
	case strings.Contains(lower, "opr/") || strings.Contains(lower, "opera"):
		device.Browser = "Opera"
	case strings.Contains(lower, "safari"):
		device.Browser = "Safari"
	default:
		device.Browser = "unknown"
	}

	switch {
	case strings.Contains(lower, "windows"):
		device.OS = "Windows"
	case strings.Contains(lower, "mac os") || strings.Contains(lower, "macintosh"):
		device.OS = "macOS"
	case strings.Contains(lower, "android"):
		device.OS = "Android"
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad") || strings.Contains(lower, "ios"):
		device.OS = "iOS"
	case strings.Contains(lower, "linux"):
		device.OS = "Linux"
	default:
		device.OS = "unknown"
	}
	return device
}

// ============================================================
// 地理定位（ip-api.com，带 TTL 缓存 + 超时；仅公网 IP 才查询）
// ============================================================

const (
	geoCacheTTL      = 10 * time.Hour       // 单 IP 解析结果缓存时长
	geoQueryTimeout  = 3 * time.Second
)

// geoCacheEntry 单 IP 的解析结果 + 缓存时间
type geoCacheEntry struct {
	loc  model.AnalyticsLocation
	at   time.Time
}

var geoCacheState = struct {
	mu sync.Mutex
	m  map[string]geoCacheEntry
}{m: map[string]geoCacheEntry{}}

var geoHTTPClient = &http.Client{Timeout: geoQueryTimeout}

func resolveLocation(ctx context.Context, ip string) model.AnalyticsLocation {
	loc := model.AnalyticsLocation{Country: "unknown", Region: "unknown", City: "unknown"}
	clean := strings.TrimPrefix(ip, "::ffff:")
	if !isPublicIP(ip) || clean == "" {
		return loc
	}

	// 命中缓存：30 分钟内直接复用，10 小时后重试
	geoCacheState.mu.Lock()
	e, ok := geoCacheState.m[clean]
	geoCacheState.mu.Unlock()
	if ok && time.Since(e.at) < geoCacheTTL {
		return e.loc
	}

	endpoint := "https://ip-api.com/json/" + clean + "?lang=zh-CN&fields=status,country,regionName,city"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return loc
	}
	resp, err := geoHTTPClient.Do(req)
	if err != nil {
		return loc
	}
	defer resp.Body.Close()

	var payload struct {
		Status     string  `json:"status"`
		Country    string `json:"country"`
		RegionName string `json:"regionName"`
		City       string `json:"city"`
	}
	if resp.StatusCode != http.StatusOK {
		return loc
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return loc
	}
	if payload.Status != "success" {
		return loc
	}
	loc = model.AnalyticsLocation{
		Country: orUnknown(payload.Country),
		Region:  orUnknown(payload.RegionName),
		City:    orUnknown(payload.City),
	}
	geoCacheState.mu.Lock()
	geoCacheState.m[clean] = geoCacheEntry{loc: loc, at: time.Now()}
	geoCacheState.mu.Unlock()
	return loc
}

func orUnknown(s string) string {
	if s == "" {
		return "unknown"
	}
	return s
}

// ============================================================
// 埋点写入 & 读取
// ============================================================

// AnalyticsInput 客户端上报的埋点字段 + 服务端推导的 IP / UA
type AnalyticsInput struct {
	Event      string
	URL        string
	Referrer   string
	Screen     string
	Properties map[string]any
	Timestamp  time.Time
	RawIP      string
	UserAgent  string
}

// CreateAnalyticsLog 组装（掩码 IP / 解析 UA / 解析地理位置）并落库
func CreateAnalyticsLog(ctx context.Context, store repository.Store, input AnalyticsInput) error {
	ts := input.Timestamp
	if ts.IsZero() {
		ts = time.Now()
	}
	props := input.Properties
	if props == nil {
		props = map[string]any{}
	}
	device := parseDevice(input.UserAgent)
	// 把 UA 解析结果转成 map 存 jsonb
	deviceMap := map[string]any{
		"browser":  device.Browser,
		"os":       device.OS,
		"isMobile": device.IsMobile,
	}

	log := &model.AnalyticsLog{
		ID:         uuid.NewString(),
		Timestamp:  ts,
		Event:      input.Event,
		URL:        input.URL,
		Referrer:   input.Referrer,
		Screen:     input.Screen,
		Properties: props,
		Location:   locationToMap(resolveLocation(ctx, input.RawIP)),
		Device:     deviceMap,
		IPMasked:   maskIP(input.RawIP),
	}
	return store.CreateAnalyticsLog(ctx, log)
}

func locationToMap(loc model.AnalyticsLocation) map[string]any {
	return map[string]any{
		"country": loc.Country,
		"region":  loc.Region,
		"city":    loc.City,
	}
}

// GetAnalyticsSummary 读取最近日志 + 统计信息（供后台展示）
func GetAnalyticsSummary(ctx context.Context, store repository.Store, retention time.Duration) ([]model.AnalyticsLog, map[string]any, error) {
	logs, err := store.ListAnalyticsLogs(ctx, 500)
	if err != nil {
		return nil, nil, err
	}
	total, err := store.CountAnalyticsLogs(ctx)
	if err != nil {
		return nil, nil, err
	}
	cutoff := time.Now().Add(-retention)
	expired, err := store.CountExpiredAnalyticsLogs(ctx, cutoff)
	if err != nil {
		return nil, nil, err
	}
	// 库表无“文件”概念：用是否含过期数据表达，兼容原前端展示
	expiredFiles := 0
	if expired > 0 {
		expiredFiles = 1
	}
	stats := map[string]any{
		"totalLogs":       total,
		"totalFiles":      0,
		"expiredFiles":    expiredFiles,
		"expiredLogsCount": expired,
		"retentionDays":   int(retention.Hours() / 24),
	}
	return logs, stats, nil
}

// DeleteExpiredAnalyticsLogs 删除超过保留期的日志，返回删除条数
func DeleteExpiredAnalyticsLogs(ctx context.Context, store repository.Store, retention time.Duration) (int64, error) {
	return store.DeleteExpiredAnalyticsLogs(ctx, time.Now().Add(-retention))
}

// AnalyticsRetention 埋点保留期（与原后端 30 天一致）
const AnalyticsRetention = 30 * 24 * time.Hour