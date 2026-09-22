package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RequireInternalSecret 校验 X-Internal-Secret 头
// 试点阶段：Next.js Server Action 转发请求时携带此密钥，Go 侧信任内网调用
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

// RequirePermission 校验 X-User-Permissions 头是否包含指定权限
// 试点阶段：Next.js 侧 withActionPermission 已校验，Go 侧仅做二次验证
func RequirePermission(perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		perms := c.GetHeader("X-User-Permissions")
		if perms == "" {
			// 未携带权限头时放行（依赖上游 Next.js 已校验）
			c.Next()
			return
		}
		for _, p := range strings.Split(perms, ",") {
			if strings.TrimSpace(p) == perm {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "无权限"})
	}
}
