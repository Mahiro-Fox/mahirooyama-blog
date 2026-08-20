// Package service
// admin_auth_service.go：后台管理员登录/鉴权/登出服务（纯函数编排）
package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"mahirooyama-blog/backend-go/internal/auth"
	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// AdminLoginResult 登录返回（不含密码）
type AdminLoginResult struct {
	Token     string           `json:"token"`
	SessionID string           `json:"sessionId"`
	ExpiresIn int              `json:"expiresIn"`
	User      model.AdminUser  `json:"user"`
	LoggedInAt string          `json:"loggedInAt"`
}

// AdminVerifyResult 鉴权返回（形状对齐 Next lib/admin-auth.ts verifyAuth 返回）
type AdminVerifyResult struct {
	Success             bool              `json:"success"`
	Error               string            `json:"error,omitempty"`
	UserID              string            `json:"userId,omitempty"`
	Username            string            `json:"username,omitempty"`
	Avatar              string            `json:"avatar,omitempty"`
	Role                string            `json:"role,omitempty"`
	MustChangePassword  bool              `json:"mustChangePassword,omitempty"`
	LoggedInAt          string            `json:"loggedInAt,omitempty"`
	ExpiresAt           int64             `json:"expiresAt,omitempty"` // Unix 秒，兼容 Next admin-auth
	SessionID           string            `json:"sessionId,omitempty"`
	RecoveredSession    bool              `json:"recoveredSession,omitempty"` // 是否走「JWT 恢复会话」降级
}

// AdminLogin 用户名密码 → 查 admin_users → bcrypt → 删旧会话（单设备）→ 签发 JWT → 写会话表
func AdminLogin(ctx context.Context, store repository.Store, cfg *config.Config, username, password string) (*AdminLoginResult, error) {
	if cfg.JWTSecret == "" {
		return nil, errors.New("服务端 JWT_SECRET 未配置")
	}
	user, err := VerifyAdminUser(ctx, store, username, password)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	sessionID := auth.NewSessionID()
	secret := []byte(cfg.JWTSecret)
	// 单设备登录：删旧会话（先删后建，事务外）
	if _, e := store.DeleteAdminSessionsByAdminUserID(ctx, user.ID); e != nil {
		return nil, fmt.Errorf("清理旧会话失败: %w", e)
	}
	token, err := auth.SignAdmin(
		secret, cfg.AdminIssuer, cfg.SessionTTLSeconds,
		user.ID, user.Username, user.Avatar, string(user.Role), sessionID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("签发 JWT 失败: %w", err)
	}
	session := &model.AdminSession{
		Token:       token,
		AdminUserID: user.ID,
		SessionID:   sessionID,
		CreatedAt:   now,
		LastUsedAt:  now,
		ExpiresAt:   now.Add(time.Duration(cfg.SessionTTLSeconds) * time.Second),
		UserAgent:   "", // 由 Next Action 里的请求上下文填充更方便；不填不影响语义
		IP:          "",
	}
	if e := store.CreateAdminSession(ctx, session); e != nil {
		return nil, fmt.Errorf("写入会话失败: %w", e)
	}
	return &AdminLoginResult{
		Token:      token,
		SessionID:  sessionID,
		ExpiresIn:  cfg.SessionTTLSeconds,
		User:       *user,
		LoggedInAt: now.UTC().Format(time.RFC3339),
	}, nil
}

// AdminVerify 校验 token：JWT → 查 admin_sessions（必要时自动恢复）→ 更新 last_used_at
// 失败返回 (*AdminVerifyResult, nil)，Success=false + Error。只有内部错误才返回 (nil, error)。
func AdminVerify(ctx context.Context, store repository.Store, cfg *config.Config, token string) (*AdminVerifyResult, error) {
	if strings.TrimSpace(token) == "" || cfg.JWTSecret == "" {
		return &AdminVerifyResult{Success: false, Error: "未登录"}, nil
	}
	secret := []byte(cfg.JWTSecret)
	claims, parseErr := auth.VerifyAdmin(token, secret, cfg.AdminIssuer)
	if parseErr != nil {
		return &AdminVerifyResult{Success: false, Error: "登录已过期，请重新登录"}, nil
	}

	// 1) 查会话（存在性校验 + 单设备踢下线判断）
	session, sessErr := store.GetAdminSessionByToken(ctx, token)
	if sessErr != nil && !errors.Is(sessErr, repository.ErrAdminSessionNotFound) {
		return nil, fmt.Errorf("查 admin session 失败: %w", sessErr)
	}
	recovered := false
	if session == nil && cfg.SessionAutoRecover {
		// 降级：JWT 合法但 PG 中无会话 → 自动恢复（防止升级瞬间全员重登）。
		// 用户是否存在由下方 GetAdminUserByID 统一校验，这里不做冗余预查。
		if claims.UserID == "" || claims.SessionID == "" {
			return &AdminVerifyResult{Success: false, Error: "会话已在其他设备上失效，请重新登录"}, nil
		}
		if e := store.CreateAdminSession(ctx, &model.AdminSession{
			Token:       token,
			AdminUserID: claims.UserID,
			SessionID:   claims.SessionID,
			CreatedAt:   time.Now(),
			LastUsedAt:  time.Now(),
			ExpiresAt:   time.Unix(claims.ExpiresAtUnix(), 0),
		}); e != nil {
			log.Printf("admin session 恢复失败: %v", e)
		} else {
			recovered = true
			if s, e := store.GetAdminSessionByToken(ctx, token); e == nil {
				session = s
			}
		}
	}
	if session == nil {
		return &AdminVerifyResult{Success: false, Error: "会话已在其他设备上失效，请重新登录"}, nil
	}

	// 3) 更新 last_used_at（失败不阻挡鉴权通过，但记录日志便于排查）
	if e := store.UpdateAdminSessionLastUsedAt(ctx, token, time.Now()); e != nil {
		log.Printf("更新 admin session last_used_at 失败: %v", e)
	}

	// 4) 取「最新用户信息」（避免 JWT 里的 avatar/role 等字段过期）
	user, userErr := store.GetAdminUserByID(ctx, session.AdminUserID)
	if userErr != nil {
		if errors.Is(userErr, repository.ErrAdminUserNotFound) {
			return &AdminVerifyResult{Success: false, Error: "用户不存在或已被删除"}, nil
		}
		return nil, fmt.Errorf("查 admin user 失败: %w", userErr)
	}
	return &AdminVerifyResult{
		Success:            true,
		UserID:             user.ID,
		Username:           user.Username,
		Avatar:             coalesceString(user.Avatar, "/uploads/images/avatar/default-avatar.webp"),
		Role:               string(user.Role),
		MustChangePassword: user.MustChangePassword,
		LoggedInAt:         claims.LoggedInAt,
		ExpiresAt:          claims.ExpiresAtUnix(),
		SessionID:          session.SessionID,
		RecoveredSession:   recovered,
	}, nil
}

// AdminLogout 从 admin_sessions 删除 token
func AdminLogout(ctx context.Context, store repository.Store, token string) error {
	if strings.TrimSpace(token) == "" {
		return nil
	}
	err := store.DeleteAdminSessionByToken(ctx, token)
	if err != nil && errors.Is(err, repository.ErrAdminSessionNotFound) {
		// 不在表中视为已登出，幂等
		return nil
	}
	return err
}

// CleanupExpiredAdminSessions 后台 goroutine 定时执行；返回删除的行数
func CleanupExpiredAdminSessions(ctx context.Context, store repository.Store, now time.Time) (int64, error) {
	return store.DeleteExpiredAdminSessions(ctx, now)
}

// coalesceString 空字符串兜底（纯工具，不暴露给外部）
func coalesceString(s, fallback string) string {
	if strings.TrimSpace(s) == "" {
		return fallback
	}
	return s
}
