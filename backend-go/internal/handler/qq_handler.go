package handler

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/service"
)

// QQSearchHandler GET /api/cloudmusic/qq/search?keywords=&limit=
func QQSearchHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		keywords := c.Query("keywords")
		limit := parseLimit(c, "limit", 12)
		if limit > 20 {
			limit = 20
		}
		songs := service.QQSearch(c.Request.Context(), cloudClient(), keywords, limit)
		c.JSON(http.StatusOK, gin.H{"songs": songs})
	}
}

// QQSongURLHandler GET /api/cloudmusic/qq/songurl?mid=&mediaMid=&quality=
func QQSongURLHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		mid := c.Query("mid")
		mediaMid := c.Query("mediaMid")
		quality := c.Query("quality")
		result := service.QQSongURL(c.Request.Context(), cloudClient(), mid, mediaMid, quality, service.GetQQCookie())
		c.JSON(http.StatusOK, result)
	}
}

// QQProfileHandler GET /api/cloudmusic/qq/profile
func QQProfileHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, service.QQProfile(service.GetQQCookie()))
	}
}

// QQUserPlaylistsHandler GET /api/cloudmusic/qq/user/playlists
func QQUserPlaylistsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		result := service.QQUserPlaylists(c.Request.Context(), cloudClient(), service.GetQQCookie())
		status := http.StatusOK
		if !result.LoggedIn {
			status = http.StatusUnauthorized
		}
		c.JSON(status, result)
	}
}

// QQPlaylistTracksHandler GET /api/cloudmusic/qq/playlist/tracks?id=&limit=
func QQPlaylistTracksHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")
		limit := parseLimit(c, "limit", 200)
		result := service.QQPlaylistTracks(c.Request.Context(), cloudClient(), id, limit, service.GetQQCookie())
		status := http.StatusOK
		if !result.LoggedIn {
			status = http.StatusUnauthorized
		}
		c.JSON(status, result)
	}
}

// QQLyricHandler GET /api/cloudmusic/qq/lyric?mid=&id=
func QQLyricHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		mid := c.Query("mid")
		id := c.Query("id")
		result := service.QQLyric(c.Request.Context(), cloudClient(), mid, id, service.GetQQCookie())
		c.JSON(http.StatusOK, result)
	}
}

// QQCoverHandler GET /api/cloudmusic/qq/cover?id=&size=
func QQCoverHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		albumMid := c.Query("id")
		if albumMid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing album id"})
			return
		}
		size := parseLimit(c, "size", 300)
		u := service.RQQCoverURL(albumMid, size)
		req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, u, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Proxy cover failed"})
			return
		}
		req.Header.Set("Referer", "https://y.qq.com/")
		resp, err := cloudClient().Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Proxy cover failed"})
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Proxy cover failed"})
			return
		}
		c.Header("Access-Control-Allow-Origin", "*")
		if ct := resp.Header.Get("Content-Type"); ct != "" {
			c.Header("Content-Type", ct)
		} else {
			c.Header("Content-Type", "image/jpeg")
		}
		c.Header("Cache-Control", "public, max-age=2592000")
		c.Status(resp.StatusCode)
		_, _ = io.Copy(c.Writer, resp.Body)
	}
}

// QQAudioHandler GET /api/cloudmusic/qq/audio?mid=&mediaMid=&quality=
func QQAudioHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		result := service.QQSongURL(c.Request.Context(), cloudClient(), c.Query("mid"), c.Query("mediaMid"), c.Query("quality"), service.GetQQCookie())
		if !result.Playable || result.URL == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "No playable QQ url for this song", "message": result.Message})
			return
		}
		// Range 头在 StreamAudio 内部根据上游返回 206 透传
		_ = service.StreamAudio(c.Request.Context(), cloudClient(), c.Writer, result.URL)
	}
}
