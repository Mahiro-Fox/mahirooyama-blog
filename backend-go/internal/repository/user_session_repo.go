// Package repository
// user_session_repo.go：前台访客会话 CRUD（GormStore 的一部分，实现 Store 接口）
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrUserSessionNotFound 前台会话不存在
var ErrUserSessionNotFound = errors.New("user session not found")

// CreateUserSession 新建用户会话
func (s *GormStore) CreateUserSession(ctx context.Context, us *model.UserSession) error {
	if err := s.db.WithContext(ctx).Create(us).Error; err != nil {
		return fmt.Errorf("create user session: %w", err)
	}
	return nil
}

// GetUserSessionByToken 按 token 查询
func (s *GormStore) GetUserSessionByToken(ctx context.Context, token string) (*model.UserSession, error) {
	var us model.UserSession
	if err := s.db.WithContext(ctx).First(&us, "token = ?", token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserSessionNotFound
		}
		return nil, fmt.Errorf("get user session by token: %w", err)
	}
	return &us, nil
}

// DeleteUserSessionByToken 前台登出：删 token
func (s *GormStore) DeleteUserSessionByToken(ctx context.Context, token string) error {
	res := s.db.WithContext(ctx).Where("token = ?", token).Delete(&model.UserSession{})
	if res.Error != nil {
		return fmt.Errorf("delete user session by token: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrUserSessionNotFound
	}
	return nil
}

// DeleteUserSessionsByAccountID 单设备登录：把账号旧会话全部删掉
func (s *GormStore) DeleteUserSessionsByAccountID(ctx context.Context, accountID string) (int64, error) {
	res := s.db.WithContext(ctx).Where("account_id = ?", accountID).Delete(&model.UserSession{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete user sessions by account: %w", res.Error)
	}
	return res.RowsAffected, nil
}

// UpdateUserSessionLastUsedAt 更新 last_used_at
func (s *GormStore) UpdateUserSessionLastUsedAt(ctx context.Context, token string, at time.Time) error {
	res := s.db.WithContext(ctx).
		Model(&model.UserSession{}).
		Where("token = ?", token).
		Update("last_used_at", at)
	if res.Error != nil {
		return fmt.Errorf("update user session last used: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrUserSessionNotFound
	}
	return nil
}

// DeleteExpiredUserSessions 定时任务：清理过期会话
func (s *GormStore) DeleteExpiredUserSessions(ctx context.Context, now time.Time) (int64, error) {
	res := s.db.WithContext(ctx).
		Where("expires_at < ?", now).
		Delete(&model.UserSession{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete expired user sessions: %w", res.Error)
	}
	return res.RowsAffected, nil
}
