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
func ListAdminUsers(ctx context.Context, db *gorm.DB) ([]model.AdminUser, error) {
	var users []model.AdminUser
	if err := db.WithContext(ctx).Order("username ASC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("list admin users: %w", err)
	}
	return users, nil
}

// GetAdminUserByID 按 ID 查询后台用户
func GetAdminUserByID(ctx context.Context, db *gorm.DB, id string) (*model.AdminUser, error) {
	var u model.AdminUser
	if err := db.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminUserNotFound
		}
		return nil, fmt.Errorf("get admin user: %w", err)
	}
	return &u, nil
}

// GetAdminUserByUsername 按用户名查询（登录用）
func GetAdminUserByUsername(ctx context.Context, db *gorm.DB, username string) (*model.AdminUser, error) {
	var u model.AdminUser
	if err := db.WithContext(ctx).Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminUserNotFound
		}
		return nil, fmt.Errorf("get admin user by username: %w", err)
	}
	return &u, nil
}

// CreateAdminUser 创建后台用户
func CreateAdminUser(ctx context.Context, db *gorm.DB, u *model.AdminUser) error {
	if err := db.WithContext(ctx).Create(u).Error; err != nil {
		return fmt.Errorf("create admin user: %w", err)
	}
	return nil
}

// UpdateAdminUser 按 ID 更新指定字段
func UpdateAdminUser(ctx context.Context, db *gorm.DB, id string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.AdminUser{}).
		Where("id = ?", id).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update admin user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAdminUserNotFound
	}
	return nil
}

// DeleteAdminUser 按 ID 删除后台用户
func DeleteAdminUser(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.AdminUser{})
	if result.Error != nil {
		return fmt.Errorf("delete admin user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAdminUserNotFound
	}
	return nil
}
