// Package service
// user_auth_service.go：前台访客账户 登录/鉴权/登出（与 admin_auth 对称，但校验来源是 accounts）
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/auth"
	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// UserLoginResult 前台登录返回
type UserLoginResult struct {
	Token      string                 `json:"token"`
	SessionID  string                 `json:"sessionId"`
	ExpiresIn  int                    `json:"expiresIn"`
	Account    model.PublicAccountDTO `json:"account"`
	LoggedInAt string                 `json:"loggedInAt"`
}

// UserVerifyResult 前台鉴权返回（对齐 Next user-auth.ts verifyUserAuth）
type UserVerifyResult struct {
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
	AccountID string `json:"accountId,omitempty"`
	Username  string `json:"username,omitempty"`
	Email     string `json:"email,omitempty"`
	LoggedInAt string `json:"loggedInAt,omitempty"`
	ExpiresAt  int64  `json:"expiresAt,omitempty"`
	SessionID  string `json:"sessionId,omitempty"`
	RecoveredSession bool `json:"recoveredSession,omitempty"`
}

// UserLogin 前台登录：username/email + password → 查 accounts → bcrypt → 删旧会话 → 签发 JWT → 写会话
// 支持用 username 或 email 登录（先按 username 查，查不到再按 email 查，和 Next 保持一致）
func UserLogin(ctx context.Context, db *gorm.DB, cfg *config.Config, username, password string) (*UserLoginResult, error) {
	if cfg.JWTSecret == "" {
		return nil, errors.New("服务端 JWT_SECRET 未配置")
	}
	if strings.TrimSpace(username) == "" {
		return nil, errors.New("请输入用户名或邮箱")
	}
	a, err := repository.GetAccountByUsername(ctx, db, username)
	if err != nil {
		if errors.Is(err, repository.ErrAccountNotFound) {
			a, err = repository.GetAccountByEmail(ctx, db, username)
		}
		if err != nil {
			if errors.Is(err, repository.ErrAccountNotFound) {
				return nil, errors.New("用户名或密码错误")
			}
			return nil, fmt.Errorf("查账户失败: %w", err)
		}
	}
	if a.PasswordHash == "" {
		return nil, errors.New("用户名或密码错误")
	}
	if !verifyPassword(ctx, password, a.PasswordHash) {
		return nil, errors.New("用户名或密码错误")
	}
	now := time.Now()
	sessionID := auth.NewSessionID()
	secret := []byte(cfg.JWTSecret)
	if _, e := repository.DeleteUserSessionsByAccountID(ctx, db, a.ID); e != nil {
		return nil, fmt.Errorf("清理旧会话失败: %w", e)
	}
	email := ""
	if a.Email != nil {
		email = *a.Email
	}
	token, err := auth.SignUser(
		secret, cfg.UserIssuer, cfg.SessionTTLSeconds,
		a.ID, a.Username, email, sessionID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("签发 JWT 失败: %w", err)
	}
	session := &model.UserSession{
		Token:      token,
		AccountID:  a.ID,
		SessionID:  sessionID,
		CreatedAt:  now,
		LastUsedAt: now,
		ExpiresAt:  now.Add(time.Duration(cfg.SessionTTLSeconds) * time.Second),
		UserAgent:  "",
		IP:         "",
	}
	if e := repository.CreateUserSession(ctx, db, session); e != nil {
		return nil, fmt.Errorf("写入会话失败: %w", e)
	}
	return &UserLoginResult{
		Token:      token,
		SessionID:  sessionID,
		ExpiresIn:  cfg.SessionTTLSeconds,
		Account:    model.PublicAccountDTO{ID: a.ID, Username: a.Username, Email: a.Email, Provider: a.Provider, CreatedAt: a.CreatedAt},
		LoggedInAt: now.UTC().Format(time.RFC3339),
	}, nil
}

// UserVerify 前台鉴权：JWT 校验 → 查会话（必要时恢复）→ 更新 last_used_at → 返回最新账户信息
func UserVerify(ctx context.Context, db *gorm.DB, cfg *config.Config, token string) (*UserVerifyResult, error) {
	if strings.TrimSpace(token) == "" || cfg.JWTSecret == "" {
		return &UserVerifyResult{Success: false, Error: "未登录"}, nil
	}
	secret := []byte(cfg.JWTSecret)
	claims, parseErr := auth.VerifyUser(token, secret, cfg.UserIssuer)
	if parseErr != nil {
		return &UserVerifyResult{Success: false, Error: "登录已过期，请重新登录"}, nil
	}

	session, sessErr := repository.GetUserSessionByToken(ctx, db, token)
	if sessErr != nil && !errors.Is(sessErr, repository.ErrUserSessionNotFound) {
		return nil, fmt.Errorf("查 user session 失败: %w", sessErr)
	}
	recovered := false
	if session == nil && cfg.SessionAutoRecover {
		if claims.AccountID == "" || claims.SessionID == "" {
			return &UserVerifyResult{Success: false, Error: "会话已在其他设备上失效，请重新登录"}, nil
		}
		recoverErr := func() error {
			a, e := repository.GetAccountByID(ctx, db, claims.AccountID)
			if e != nil {
				return e
			}
			_ = a
			return repository.CreateUserSession(ctx, db, &model.UserSession{
				Token:      token,
				AccountID:  claims.AccountID,
				SessionID:  claims.SessionID,
				CreatedAt:  time.Now(),
				LastUsedAt: time.Now(),
				ExpiresAt:  time.Unix(claims.ExpiresAtUnix(), 0),
			})
		}()
		if recoverErr == nil {
			recovered = true
			if s, e := repository.GetUserSessionByToken(ctx, db, token); e == nil {
				session = s
			}
		}
	}
	if session == nil {
		return &UserVerifyResult{Success: false, Error: "会话已在其他设备上失效，请重新登录"}, nil
	}

	_ = repository.UpdateUserSessionLastUsedAt(ctx, db, token, time.Now())

	a, aErr := repository.GetAccountByID(ctx, db, session.AccountID)
	if aErr != nil {
		if errors.Is(aErr, repository.ErrAccountNotFound) {
			return &UserVerifyResult{Success: false, Error: "账户不存在或已被删除"}, nil
		}
		return nil, fmt.Errorf("查 account 失败: %w", aErr)
	}
	email := ""
	if a.Email != nil {
		email = *a.Email
	}
	return &UserVerifyResult{
		Success:          true,
		AccountID:        a.ID,
		Username:         a.Username,
		Email:            email,
		LoggedInAt:       claims.LoggedInAt,
		ExpiresAt:        claims.ExpiresAtUnix(),
		SessionID:        session.SessionID,
		RecoveredSession: recovered,
	}, nil
}

// UserLogout 前台登出：删除 user_sessions.token
func UserLogout(ctx context.Context, db *gorm.DB, token string) error {
	if strings.TrimSpace(token) == "" {
		return nil
	}
	err := repository.DeleteUserSessionByToken(ctx, db, token)
	if err != nil && errors.Is(err, repository.ErrUserSessionNotFound) {
		return nil
	}
	return err
}

// CleanupExpiredUserSessions 定时清理过期 user_sessions
func CleanupExpiredUserSessions(ctx context.Context, db *gorm.DB, now time.Time) (int64, error) {
	return repository.DeleteExpiredUserSessions(ctx, db, now)
}
