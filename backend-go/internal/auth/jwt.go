// Package auth
// jwt.go：JWT HS256 签发与校验（纯函数，不依赖 DB/HTTP）。
// 通过不同 Issuer + 外部传入 secret（可共用）严格区分 admin/user 两类 token，
// 避免「前台 user-session token 被当作 admin-session 使用」的风险。
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// 标准声明中使用的自定义字段名（与 Next 端 JWT 保持一一对应，便于上线初期 JWT 兼容）
const (
	claimKeyUserID      = "userId"
	claimKeyAccountID   = "accountId" // Next 历史字段：前台 accountId；新版统一写 sub
	claimKeyUsername    = "username"
	claimKeyAvatar      = "avatar"
	claimKeyRole        = "role"
	claimKeyEmail       = "email"
	claimKeySessionID   = "sessionId"
	claimKeyLoggedInAt  = "loggedInAt"
)

// ErrInvalidToken token 验签/声明失败
var ErrInvalidToken = errors.New("invalid token")

// AdminClaims 后台管理员登录态的 JWT 自定义声明（用于类型安全的签发）
type AdminClaims struct {
	UserID     string `json:"userId,omitempty"`
	Username   string `json:"username,omitempty"`
	Avatar     string `json:"avatar,omitempty"`
	Role       string `json:"role,omitempty"`
	SessionID  string `json:"sessionId,omitempty"`
	LoggedInAt string `json:"loggedInAt,omitempty"` // ISO8601
	jwt.RegisteredClaims
}

// UserClaims 前台访客账户登录态的 JWT 自定义声明
type UserClaims struct {
	AccountID  string `json:"accountId,omitempty"`
	Username   string `json:"username,omitempty"`
	Email      string `json:"email,omitempty"`
	SessionID  string `json:"sessionId,omitempty"`
	LoggedInAt string `json:"loggedInAt,omitempty"`
	jwt.RegisteredClaims
}

// SignAdmin 签发后台登录 JWT（HS256）
// - issuer: 预期为 config.AdminIssuer（"admin:mahirooyama"）
// - ttlSeconds: 过期秒数（一般 86400）
// - subject: AdminUser ID
func SignAdmin(
	secret []byte,
	issuer string,
	ttlSeconds int,
	userID, username, avatar, role, sessionID string,
	loggedInAt time.Time,
) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("empty jwt secret")
	}
	issuedAt := time.Now()
	claims := AdminClaims{
		UserID:     userID,
		Username:   username,
		Avatar:     avatar,
		Role:       role,
		SessionID:  sessionID,
		LoggedInAt: loggedInAt.UTC().Format(time.RFC3339),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(time.Duration(ttlSeconds) * time.Second)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret)
}

// SignUser 签发前台登录 JWT（HS256）
// - issuer: 预期为 config.UserIssuer（"user:mahirooyama"）
// - accountId/email: 允许 email 为空
func SignUser(
	secret []byte,
	issuer string,
	ttlSeconds int,
	accountID, username, email, sessionID string,
	loggedInAt time.Time,
) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("empty jwt secret")
	}
	issuedAt := time.Now()
	claims := UserClaims{
		AccountID:  accountID,
		Username:   username,
		Email:      email,
		SessionID:  sessionID,
		LoggedInAt: loggedInAt.UTC().Format(time.RFC3339),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   accountID,
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(time.Duration(ttlSeconds) * time.Second)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret)
}

// VerifyAdmin 校验后台登录 JWT：HS256 + issuer 匹配 + exp 合法
// 成功则返回解析后的 AdminClaims（含 userId / username / avatar / role / sessionId / exp）
func VerifyAdmin(tokenString string, secret []byte, expectedIssuer string) (*AdminClaims, error) {
	claims := &AdminClaims{}
	if err := safeParse(tokenString, secret, expectedIssuer, claims); err != nil {
		return nil, err
	}
	return claims, nil
}

// VerifyUser 校验前台登录 JWT
func VerifyUser(tokenString string, secret []byte, expectedIssuer string) (*UserClaims, error) {
	claims := &UserClaims{}
	if err := safeParse(tokenString, secret, expectedIssuer, claims); err != nil {
		return nil, err
	}
	return claims, nil
}

// safeParse 统一的解析流程：HS256 校验密钥算法 → issuer 匹配 → 声明绑定
func safeParse(tokenString string, secret []byte, expectedIssuer string, claims jwt.Claims) error {
	if tokenString == "" || len(secret) == 0 {
		return ErrInvalidToken
	}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}),
		jwt.WithIssuer(expectedIssuer),
		jwt.WithExpirationRequired(),
	)
	if _, err := parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return secret, nil
	}); err != nil {
		return errors.Join(ErrInvalidToken, err)
	}
	return nil
}

// ExpiresAtUnix 返回 claims 中过期时间的 UNIX 秒（便于 Next verify 返回 expiresAt 字段）。
// 因为 Next 端 admin-auth 返回的是秒（jwt exp 惯例），这里保持一致。
func (c *AdminClaims) ExpiresAtUnix() int64 {
	if c == nil || c.ExpiresAt == nil {
		return 0
	}
	return c.ExpiresAt.Unix()
}

// ExpiresAtUnix User 版
func (c *UserClaims) ExpiresAtUnix() int64 {
	if c == nil || c.ExpiresAt == nil {
		return 0
	}
	return c.ExpiresAt.Unix()
}
