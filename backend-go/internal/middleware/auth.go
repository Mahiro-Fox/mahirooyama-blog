package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/auth"
	"mahirooyama-blog/backend-go/internal/repository"
)

// 鉴权上下文键。下游 handler 可通过 c.Get(CtxKeyUserID) 等取用。
const (
	CtxKeyUserID    = "userId"
	CtxKeyRole      = "role"
	CtxKeySessionID = "sessionId"
)

// RequireInternalSecret 校验 X-Internal-Secret 头。
// 改造后只承担"网络层身份确认"：确认请求来自同机 Next.js 转发，
// 不再承担用户授权——用户授权由 RequireSession + RequirePermission 完成。
func RequireInternalSecret(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		provided := c.GetHeader("X-Internal-Secret")
		if !secretMatches(secret, provided) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}
		c.Next()
	}
}

func secretMatches(secret, provided string) bool {
	if secret == "" || len(secret) != len(provided) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(secret), []byte(provided)) == 1
}

// AllowAnonymous 显式声明此路由无需登录态。
// 用于公开读接口（GET /api/movies 等），从"漏掉守卫"改为"显式声明匿名"，
// 避免后续误把新加的公开接口挂在需鉴权的 group 下。
func AllowAnonymous() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// RequireSession 从 Authorization: Bearer <token> 解析 JWT，
// 把 userId / role / sessionId 写入 gin context。
// fail-closed：无合法 token 直接 401。
// 阶段 1 灰度：只识别 admin issuer，因为只保护后台写接口。
func RequireSession(secret, adminIssuer string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			return
		}
		claims, err := auth.VerifyAdmin(token, []byte(secret), adminIssuer)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "登录已过期"})
			return
		}
		c.Set(CtxKeyUserID, claims.UserID)
		c.Set(CtxKeyRole, claims.Role)
		c.Set(CtxKeySessionID, claims.SessionID)
		c.Next()
	}
}

// RequirePermission fail-closed：必须先经过 RequireSession 写入 role；
// 若无 role，直接 401（说明未登录或 RequireSession 未挂）；否则查 DB 鉴权。
// 不信任任何上游明文头（如 X-User-Permissions）。
// 支持两种权限格式：精确匹配（"movies:update"）与全权限通配（"*"，super_admin）。
func RequirePermission(store repository.Store, perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(CtxKeyRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			return
		}
		role, _ := roleVal.(string)
		if role == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			return
		}
		rp, err := store.GetRolePermissions(c.Request.Context(), role)
		if err != nil || rp == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "无权限"})
			return
		}
		if !hasPermission(rp.Permissions, perm) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "无权限"})
			return
		}
		c.Next()
	}
}

// extractBearerToken 从 Authorization: Bearer <token> 提取 token
func extractBearerToken(c *gin.Context) string {
	authz := c.GetHeader("Authorization")
	if authz == "" {
		return ""
	}
	if !strings.HasPrefix(authz, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(authz, "Bearer "))
}

// hasPermission 检查权限列表是否包含目标权限。
// 支持 "*" 全权限通配（super_admin），其余走精确匹配。
func hasPermission(perms []string, target string) bool {
	for _, p := range perms {
		if p == "*" || p == target {
			return true
		}
	}
	return false
}
