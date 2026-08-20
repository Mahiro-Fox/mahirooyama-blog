// Package repository
// admin_session_repo.go：后台会话的 CRUD（纯函数 + *gorm.DB 参数）
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrAdminSessionNotFound 会话不存在
var ErrAdminSessionNotFound = errors.New("admin session not found")

// CreateAdminSession 新建会话记录（INSERT）
func (s *GormStore) CreateAdminSession(ctx context.Context, sess *model.AdminSession) error {
	if err := s.db.WithContext(ctx).Create(sess).Error; err != nil {
		return fmt.Errorf("create admin session: %w", err)
	}
	return nil
}

// GetAdminSessionByToken 按 JWT 查询会话
func (s *GormStore) GetAdminSessionByToken(ctx context.Context, token string) (*model.AdminSession, error) {
	var sess model.AdminSession
	if err := s.db.WithContext(ctx).First(&sess, "token = ?", token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminSessionNotFound
		}
		return nil, fmt.Errorf("get admin session by token: %w", err)
	}
	return &sess, nil
}

// DeleteAdminSessionByToken 登出：删除指定 token
func (s *GormStore) DeleteAdminSessionByToken(ctx context.Context, token string) error {
	res := s.db.WithContext(ctx).Where("token = ?", token).Delete(&model.AdminSession{})
	if res.Error != nil {
		return fmt.Errorf("delete admin session by token: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrAdminSessionNotFound
	}
	return nil
}

// DeleteAdminSessionsByAdminUserID 单设备登录：登录时先把同 user 旧会话全部删掉
func (s *GormStore) DeleteAdminSessionsByAdminUserID(ctx context.Context, userID string) (int64, error) {
	res := s.db.WithContext(ctx).Where("admin_user_id = ?", userID).Delete(&model.AdminSession{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete admin sessions by user: %w", res.Error)
	}
	return res.RowsAffected, nil
}

// UpdateAdminSessionLastUsedAt 每次 verify 命中后更新 last_used_at
func (s *GormStore) UpdateAdminSessionLastUsedAt(ctx context.Context, token string, at time.Time) error {
	res := s.db.WithContext(ctx).
		Model(&model.AdminSession{}).
		Where("token = ?", token).
		Update("last_used_at", at)
	if res.Error != nil {
		return fmt.Errorf("update admin session last used: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrAdminSessionNotFound
	}
	return nil
}

// DeleteExpiredAdminSessions 定时任务：一次性清掉 expires_at < now() 的记录
// 返回删除的行数；没有过期记录返回 (0, nil) 不是错误
func (s *GormStore) DeleteExpiredAdminSessions(ctx context.Context, now time.Time) (int64, error) {
	res := s.db.WithContext(ctx).
		Where("expires_at < ?", now).
		Delete(&model.AdminSession{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete expired admin sessions: %w", res.Error)
	}
	return res.RowsAffected, nil
}
