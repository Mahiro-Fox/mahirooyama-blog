// Package service
// password_util.go：bcrypt 辅助（供 user_auth_service.go 使用，避免 account_service.go 的循环引用风险；
// 后续如果 admin_user 的 VerifyAdminUser 需要共享，也直接调用）
package service

import (
	"context"

	"golang.org/x/crypto/bcrypt"
)

// verifyPassword 纯函数：比较 bcrypt 哈希；ctx 占位以便未来扩展审计/metrics
func verifyPassword(_ context.Context, plain, hash string) bool {
	if plain == "" || hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
