package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/service"
)

func cloudClient() *http.Client {
	return service.SharedClient()
}

// parseLimit 解析 limit 查询参数，非法数值返回默认值
func parseLimit(c *gin.Context, key string, def int) int {
	raw := c.Query(key)
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

// NeteaseSearchHandler GET /api/cloudmusic/netease/search
func NeteaseSearchHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		keywords := c.Query("keywords")
		limit := parseLimit(c, "limit", 10)
		songs := service.NeteaseSearch(c.Request.Context(), cloudClient(), keywords, limit, service.GetNeteaseCookie())
		c.JSON(http.StatusOK, gin.H{"songs": songs})
	}
}

// NeteasePlayableHandler GET /api/cloudmusic/netease/playable?id=&br=
func NeteasePlayableHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")
		br := c.Query("br")
		u := service.GetNeteasePlayableURL(c.Request.Context(), cloudClient(), id, service.GetNeteaseCookie(), br)
		c.JSON(http.StatusOK, gin.H{"url": u})
	}
}

// NeteaseAccountHandler GET /api/cloudmusic/netease/account
func NeteaseAccountHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		account := service.NeteaseAccount(c.Request.Context(), cloudClient(), service.GetNeteaseCookie())
		c.JSON(http.StatusOK, account)
	}
}

// NeteaseDailyHandler GET /api/cloudmusic/netease/daily?limit=
func NeteaseDailyHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := parseLimit(c, "limit", 20)
		_, songs := service.NeteaseDaily(c.Request.Context(), cloudClient(), service.GetNeteaseCookie(), limit)
		c.JSON(http.StatusOK, gin.H{"songs": songs})
	}
}

// NeteasePlaylistsHandler GET /api/cloudmusic/netease/playlists
func NeteasePlaylistsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		valid, playlists := service.NeteaseUserPlaylists(c.Request.Context(), cloudClient(), service.GetNeteaseCookie())
		if !valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "网易云未登录", "playlists": []any{}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"playlists": playlists})
	}
}

// NeteasePlaylistHandler GET /api/cloudmusic/netease/playlist?id=&limit=
func NeteasePlaylistHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")
		limit := parseLimit(c, "limit", 200)
		songs, totalCount, rawTrackCount := service.NeteasePlaylist(c.Request.Context(), cloudClient(), id, service.GetNeteaseCookie(), limit)
		c.JSON(http.StatusOK, gin.H{
			"songs":         songs,
			"totalCount":    totalCount,
			"rawTrackCount": rawTrackCount,
		})
	}
}

// NeteaseLyricHandler GET /api/cloudmusic/netease/lyric?id=
func NeteaseLyricHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")
		lyric, translated := service.NeteaseLyric(c.Request.Context(), cloudClient(), id)
		c.JSON(http.StatusOK, gin.H{"lyric": lyric, "translatedLyric": translated})
	}
}

// NeteaseAudioHandler GET /api/cloudmusic/netease/audio?id=&br=
func NeteaseAudioHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")
		br := c.Query("br")
		u := service.GetNeteasePlayableURL(c.Request.Context(), cloudClient(), id, service.GetNeteaseCookie(), br)
		if u == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "网易云无可播放地址"})
			return
		}
		if err := service.StreamAudio(c.Request.Context(), cloudClient(), c.Writer, u); err != nil {
			return
		}
	}
}

// NeteaseQRKeyHandler GET /api/cloudmusic/netease/qr/key
// 申请扫码登录的 unikey，并直接给出二维码内容供前端渲染图片。
func NeteaseQRKeyHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		unikey, code := service.NeteaseQRKey(c.Request.Context(), cloudClient())
		if unikey == "" {
			c.JSON(http.StatusBadGateway, gin.H{"error": "网易云二维码生成失败", "code": code})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"unikey":    unikey,
			"qrContent": "https://music.163.com/login?codekey=" + unikey,
			"code":      code,
		})
	}
}

// NeteaseQRCheckHandler GET /api/cloudmusic/netease/qr/check?key=
// 轮询扫码状态；code=803 时把上游下发的 cookie 写入后端单例并持久化，同时回传规范化后的 cookie，
// 供前端保存到本地存储以保持界面状态与后续请求一致（与手动粘贴 cookie 的效果相同）。
func NeteaseQRCheckHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Query("key")
		code, cookie, message := service.NeteaseQRCheck(c.Request.Context(), cloudClient(), key)
		payload := gin.H{"code": code, "message": message, "saved": false}
		if code == 803 && cookie != "" {
			payload["cookie"] = service.SetNeteaseCookie(cookie)
			payload["saved"] = true
		}
		c.JSON(http.StatusOK, payload)
	}
}
