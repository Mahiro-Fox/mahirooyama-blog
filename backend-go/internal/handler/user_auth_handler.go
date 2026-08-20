// Package handler
// user_auth_handler.go：前台用户 auth（/user/auth/login /verify /logout）
package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// UserLoginHandler 前台登录：返回 {token, account, expiresIn, sessionId, loggedInAt}
func UserLoginHandler(store repository.Store, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg == nil || store == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务未初始化"})
			return
		}
		var req model.AccountLoginInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
			return
		}
		if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名/邮箱和密码必填"})
			return
		}
		result, err := service.UserLogin(c.Request.Context(), store, cfg, req.Username, req.Password)
		if err != nil {
			if errors.Is(err, service.ErrInvalidCredentials) {
				// 凭据错误：统一 401 固定文案，不透出内部细节
				c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
				return
			}
			// 其余视为服务端内部错误：只进日志，对外返回通用文案
			log.Printf("user login internal error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "登录失败，请稍后重试"})
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
func UserVerifyHandler(store repository.Store, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		res, err := service.UserVerify(c.Request.Context(), store, cfg, token)
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
func UserLogoutHandler(store repository.Store, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusOK, gin.H{"success": true})
			return
		}
		if err := service.UserLogout(c.Request.Context(), store, token); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "登出失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
