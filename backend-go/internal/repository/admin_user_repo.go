package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrAdminUserNotFound 后台用户不存在
var ErrAdminUserNotFound = errors.New("admin user not found")

// ListAdminUsers 列出全部后台用户（按 username 升序）
func (s *GormStore) ListAdminUsers(ctx context.Context) ([]model.AdminUser, error) {
	var users []model.AdminUser
	if err := s.db.WithContext(ctx).Order("username ASC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("list admin users: %w", err)
	}
	return users, nil
}

// GetAdminUserByID 按 ID 查询后台用户
func (s *GormStore) GetAdminUserByID(ctx context.Context, id string) (*model.AdminUser, error) {
	var u model.AdminUser
	if err := s.db.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminUserNotFound
		}
		return nil, fmt.Errorf("get admin user: %w", err)
	}
	return &u, nil
}

// GetAdminUserByUsername 按用户名查询（登录用）
func (s *GormStore) GetAdminUserByUsername(ctx context.Context, username string) (*model.AdminUser, error) {
	var u model.AdminUser
	if err := s.db.WithContext(ctx).Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminUserNotFound
		}
		return nil, fmt.Errorf("get admin user by username: %w", err)
	}
	return &u, nil
}

// CreateAdminUser 创建后台用户
func (s *GormStore) CreateAdminUser(ctx context.Context, u *model.AdminUser) error {
	if err := s.db.WithContext(ctx).Create(u).Error; err != nil {
		return fmt.Errorf("create admin user: %w", err)
	}
	return nil
}

// UpdateAdminUser 按 ID 部分更新（类型化补丁，nil 指针字段不更新）
func (s *GormStore) UpdateAdminUser(ctx context.Context, id string, patch *model.AdminUserPatch) error {
	result := s.db.WithContext(ctx).
		Model(&model.AdminUser{}).
		Where("id = ?", id).
		Updates(patch)
	if result.Error != nil {
		return fmt.Errorf("update admin user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAdminUserNotFound
	}
	return nil
}

// DeleteAdminUser 按 ID 删除后台用户
func (s *GormStore) DeleteAdminUser(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&model.AdminUser{})
	if result.Error != nil {
		return fmt.Errorf("delete admin user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAdminUserNotFound
	}
	return nil
}
