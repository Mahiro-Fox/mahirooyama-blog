// Package service
// cloudcookie_service.go 云音乐 cookie 全局单例 + 本地持久化（data/cloudmusic-cookie.json）。
package service

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"mahirooyama-blog/backend-go/internal/model"
)

var (
	cloudCookieMu sync.Mutex
	neteaseCookie string
	qqCookieVal   string
	cloudDataDir  string
)

// CloudCookiePersisted 持久化的 cookie 存储结构
type CloudCookiePersisted struct {
	Netease string `json:"netease"`
	QQ      string `json:"qq"`
}

func cloudCookiePath() string {
	return filepath.Join(cloudDataDir, "cloudmusic-cookie.json")
}

// InitCloudCookie 初始化 cookie 持久化目录并从文件加载（幂等，可重复调用）
func InitCloudCookie(dataDir string) {
	cloudCookieMu.Lock()
	defer cloudCookieMu.Unlock()
	if dataDir == "" {
		return
	}
	cloudDataDir = dataDir
	data, err := os.ReadFile(cloudCookiePath())
	if err != nil {
		return
	}
	var persisted CloudCookiePersisted
	if err := json.Unmarshal(data, &persisted); err != nil {
		return
	}
	neteaseCookie = NormalizeNeteaseCookie(persisted.Netease)
	qqCookieVal = NormalizeQQCookieInput(persisted.QQ)
}

func persistCloudCookie() {
	if cloudDataDir == "" {
		return
	}
	if err := os.MkdirAll(cloudDataDir, 0o755); err != nil {
		return
	}
	persisted := CloudCookiePersisted{Netease: neteaseCookie, QQ: qqCookieVal}
	if data, err := json.MarshalIndent(persisted, "", "  "); err == nil {
		_ = os.WriteFile(cloudCookiePath(), data, 0o644)
	}
}

// SetNeteaseCookie 设置网易云 cookie 并持久化，返回规范化值
func SetNeteaseCookie(cookie string) string {
	cloudCookieMu.Lock()
	neteaseCookie = NormalizeNeteaseCookie(cookie)
	persistCloudCookie()
	cloudCookieMu.Unlock()
	return neteaseCookie
}

// GetNeteaseCookie 读取当前网易云 cookie 单例
func GetNeteaseCookie() string {
	cloudCookieMu.Lock()
	defer cloudCookieMu.Unlock()
	return neteaseCookie
}

// SetQQCookie 设置 QQ 音乐 cookie 并持久化，返回规范化值
func SetQQCookie(cookie string) string {
	cloudCookieMu.Lock()
	qqCookieVal = NormalizeQQCookieInput(cookie)
	persistCloudCookie()
	cloudCookieMu.Unlock()
	return qqCookieVal
}

// GetQQCookie 读取当前 QQ 音乐 cookie 单例
func GetQQCookie() string {
	cloudCookieMu.Lock()
	defer cloudCookieMu.Unlock()
	return qqCookieVal
}

// CookieStatus 汇总 netease/qq 账号状态（GET /api/cloudmusic/cookie）
func CookieStatus(ctx context.Context, client *http.Client) model.CloudCookieStatus {
	return model.CloudCookieStatus{
		Netease: NeteaseAccount(ctx, client, GetNeteaseCookie()),
		QQ:      QQProfile(GetQQCookie()),
	}
}
