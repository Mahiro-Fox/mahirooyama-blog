// Package service
// netsupport.go 云音乐公共辅助：共享 HTTP client、TTL 缓存、JSON fetch（重试）、
// 字符串转换、HTML 实体解码、音频流代理（支持 Range）。
package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	// cloudHTTPClient 云音乐共享 http.Client（不设全局超时，音频流需长连接）。
	cloudHTTPClient = &http.Client{}
)

// SharedClient 返回云音乐共享 http.Client
func SharedClient() *http.Client {
	return cloudHTTPClient
}

// StringOrEmpty 返回字符串
func StringOrEmpty(s string) string {
	return s
}

// ToString 将任意值转为字符串
func ToString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(t), 'f', -1, 64)
	case bool:
		return strconv.FormatBool(t)
	default:
		return ""
	}
}

// ToInt64 将任意数值转为 int64
func ToInt64(v any) int64 {
	switch t := v.(type) {
	case int:
		return int64(t)
	case int64:
		return t
	case float64:
		return int64(t)
	case float32:
		return int64(t)
	case string:
		if n, err := strconv.ParseFloat(strings.TrimSpace(t), 64); err == nil {
			return int64(n)
		}
	}
	return 0
}

// --- TTL 缓存（标准库 map + 互斥锁） ---

type cacheEntry[V any] struct {
	value     V
	expiresAt time.Time
}

type ttlCache[K comparable, V any] struct {
	mu  sync.Mutex
	ttl time.Duration
	m   map[K]cacheEntry[V]
}

func newTTLCache[K comparable, V any](ttl time.Duration) *ttlCache[K, V] {
	return &ttlCache[K, V]{ttl: ttl, m: map[K]cacheEntry[V]{}}
}

func (c *ttlCache[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.m[key]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(c.m, key)
		var zero V
		return zero, false
	}
	return entry.value, true
}

func (c *ttlCache[K, V]) Set(key K, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = cacheEntry[V]{value: value, expiresAt: time.Now().Add(c.ttl)}
}

func (c *ttlCache[K, V]) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m = map[K]cacheEntry[V]{}
}

// --- JSON fetch（重试） ---

// fetchJSON 请求并解析 JSON；build 用于每次尝试构造新请求（POST body 复用需重建）。
// retries 为额外重试次数；遇到 HTTP 非 2xx 或业务 code==400 时按退避重试。
func fetchJSON(ctx context.Context, client *http.Client, build func() (*http.Request, error), retries int) map[string]any {
	var last map[string]any
	for attempt := 0; attempt <= retries; attempt++ {
		req, err := build()
		if err != nil {
			return last
		}
		req = req.WithContext(ctx)
		resp, err := client.Do(req)
		if err != nil {
			if attempt < retries {
				time.Sleep(time.Duration(180*(attempt+1)) * time.Millisecond)
			}
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			if attempt < retries {
				time.Sleep(time.Duration(180*(attempt+1)) * time.Millisecond)
			}
			continue
		}
		data := map[string]any{}
		_ = json.Unmarshal(body, &data)
		if data == nil {
			data = map[string]any{}
		}
		last = data
		codeOK := resp.StatusCode >= 200 && resp.StatusCode < 300
		apiCode, _ := data["code"].(float64)
		if codeOK && apiCode != 400 {
			return data
		}
		if attempt < retries {
			time.Sleep(time.Duration(180*(attempt+1)) * time.Millisecond)
		}
	}
	return last
}

func fetchJSONNoRetry(ctx context.Context, client *http.Client, build func() (*http.Request, error)) map[string]any {
	return fetchJSON(ctx, client, build, 0)
}

// --- 音频流代理 ---

// audioContentType 根据 URL 扩展名推断 Content-Type，缺省回退上游类型
func audioContentType(audioURL, upstreamType string) string {
	lower := strings.ToLower(audioURL)
	switch {
	case strings.Contains(lower, ".flac"):
		return "audio/flac"
	case strings.Contains(lower, ".mp3"):
		return "audio/mpeg"
	case strings.Contains(lower, ".m4a"), strings.Contains(lower, ".mp4"):
		return "audio/mp4"
	}
	if upstreamType != "" {
		return upstreamType
	}
	return "audio/mpeg"
}

// StreamAudio 代理音频流：转发上游 Range，回填上游状态码与响应头并流式转发响应体。
// referer 用于部分上游校验来源。
func StreamAudio(ctx context.Context, client *http.Client, w http.ResponseWriter, audioURL string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, audioURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
	req.Header.Set("Referer", "https://y.qq.com/")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	h := w.Header()
	for _, key := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"} {
		if v := resp.Header.Get(key); v != "" {
			h.Set(key, v)
		}
	}
	if h.Get("Content-Type") == "" {
		h.Set("Content-Type", audioContentType(audioURL, resp.Header.Get("Content-Type")))
	}
	w.WriteHeader(resp.StatusCode)
	if resp.Body != nil {
		_, err = io.Copy(w, resp.Body)
	}
	return err
}

// --- 字符串解码辅助 ---

func decodeHTMLEntities(text string) string {
	return html.UnescapeString(StringOrEmpty(text))
}

var base64Ptn = regexp.MustCompile(`^[A-Za-z0-9+/]+={0,2}$`)

// compileRegex 编译正则（无效返回空匹配器）
func compileRegex(pattern string) (*regexp.Regexp, error) {
	return regexp.Compile(pattern)
}

// decodeMaybeBase64 若输入形如 base64 则解码还原文本，否则原样返回
func decodeMaybeBase64(compact string) string {
	if data, err := base64.StdEncoding.DecodeString(compact); err == nil {
		return strings.TrimPrefix(string(data), "\uFEFF")
	}
	if data, err := base64.RawStdEncoding.DecodeString(compact); err == nil {
		return strings.TrimPrefix(string(data), "\uFEFF")
	}
	return ""
}
