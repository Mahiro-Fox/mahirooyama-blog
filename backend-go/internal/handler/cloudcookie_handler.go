package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/service"
)

// GetCloudCookieHandler GET /api/cloudmusic/cookie
func GetCloudCookieHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		status := service.CookieStatus(c.Request.Context(), cloudClient())
		c.JSON(http.StatusOK, status)
	}
}

// PutCloudCookieHandler PUT /api/cloudmusic/cookie  body{provider,cookie}
func PutCloudCookieHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var body model.CloudCookieRequestBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效", "details": err.Error()})
			return
		}
		provider := strings.ToLower(strings.TrimSpace(body.Provider))
		switch provider {
		case "netease":
			service.SetNeteaseCookie(body.Cookie)
			account := service.NeteaseAccount(c.Request.Context(), cloudClient(), service.GetNeteaseCookie())
			if !account.Valid {
				c.JSON(http.StatusBadRequest, gin.H{"provider": "netease", "valid": false, "error": "INVALID_NETEASE_COOKIE"})
				return
			}
			c.JSON(http.StatusOK, account)
		case "qq":
			service.SetQQCookie(body.Cookie)
			account := service.QQProfile(service.GetQQCookie())
			if !account.LoggedIn {
				c.JSON(http.StatusBadRequest, gin.H{"provider": "qq", "loggedIn": false, "error": "INVALID_QQ_COOKIE"})
				return
			}
			c.JSON(http.StatusOK, account)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown provider"})
		}
	}
}
