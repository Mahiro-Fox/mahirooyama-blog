// Package handler
// user_auth_handler.go：前台用户 auth（/user/auth/login /verify /logout）
package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/service"
)

type userLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// UserLoginHandler 前台登录：返回 {token, account, expiresIn, sessionId, loggedInAt}
func UserLoginHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg == nil || db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务未初始化"})
			return
		}
		var req userLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
			return
		}
		if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名/邮箱和密码必填"})
			return
		}
		result, err := service.UserLogin(c.Request.Context(), db, cfg, req.Username, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token":      result.Token,
			"account":    result.Account,
			"expiresIn":  result.ExpiresIn,
			"sessionId":  result.SessionID,
			"loggedInAt": result.LoggedInAt,
		})
	}
}

// UserVerifyHandler 前台鉴权
func UserVerifyHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		res, err := service.UserVerify(c.Request.Context(), db, cfg, token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "鉴权错误"})
			return
		}
		if !res.Success {
			c.JSON(http.StatusOK, gin.H{"success": false, "error": res.Error})
			return
		}
		c.JSON(http.StatusOK, res)
	}
}

// UserLogoutHandler 前台登出
func UserLogoutHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusOK, gin.H{"success": true})
			return
		}
		if err := service.UserLogout(c.Request.Context(), db, token); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "登出失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
