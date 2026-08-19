// Package handler
// admin_auth_handler.go：POST /api/admin/auth/login /verify /logout
package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/service"
)

// adminLoginRequest 请求体（与 Next app/api/admin/auth/login/route.ts 对应）
type adminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// AdminLoginHandler 后台登录
// Response（200）形状与 Next 路由保持一致：{token, user: AdminUser, expiresIn, mustChangePassword, sessionId, loggedInAt}
func AdminLoginHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg == nil || db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务未初始化"})
			return
		}
		var req adminLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
			return
		}
		if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码必填"})
			return
		}
		result, err := service.AdminLogin(c.Request.Context(), db, cfg, req.Username, req.Password)
		if err != nil {
			// 用户名密码错误统一 401
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token":                result.Token,
			"user":                 result.User,
			"expiresIn":            result.ExpiresIn,
			"mustChangePassword":   result.User.MustChangePassword,
			"sessionId":            result.SessionID,
			"loggedInAt":           result.LoggedInAt,
		})
	}
}

// AdminVerifyHandler 后台鉴权（Next server action 调用 → 读 cookie 里的 token 传过来）
// Authorization: Bearer <token> 或 body.token 或 query.token
func AdminVerifyHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		res, err := service.AdminVerify(c.Request.Context(), db, cfg, token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "鉴权错误"})
			return
		}
		if !res.Success {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"error":   res.Error,
			})
			return
		}
		c.JSON(http.StatusOK, res)
	}
}

// AdminLogoutHandler 后台登出：按 token 删会话
// 返回 200 { success: true }，幂等
func AdminLogoutHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusOK, gin.H{"success": true})
			return
		}
		if err := service.AdminLogout(c.Request.Context(), db, token); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "登出失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// extractToken 按优先级提取 Bearer / body.token / query.token
func extractToken(c *gin.Context) string {
	// 1) Authorization
	if ah := c.GetHeader("Authorization"); strings.HasPrefix(ah, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(ah, "Bearer "))
	}
	// 2) header X-Session-Token（Next 内部调用兼容）
	if ht := strings.TrimSpace(c.GetHeader("X-Session-Token")); ht != "" {
		return ht
	}
	// 3) JSON body.token（不 Bind 到结构体，避免重复消耗 body）
	var body map[string]any
	if err := c.ShouldBindBodyWithJSON(&body); err == nil {
		if v, ok := body["token"].(string); ok {
			return strings.TrimSpace(v)
		}
	}
	// 4) query.token
	return strings.TrimSpace(c.Query("token"))
}