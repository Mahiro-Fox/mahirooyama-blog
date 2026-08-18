package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrAccountNotFound 前台账户不存在
var ErrAccountNotFound = errors.New("account not found")

// ErrAccountUsernameTaken 用户名已被占用
var ErrAccountUsernameTaken = errors.New("username already taken")

// ListAccounts 列出全部前台账户（按创建时间倒序）
func ListAccounts(ctx context.Context, db *gorm.DB) ([]model.Account, error) {
	var accounts []model.Account
	if err := db.WithContext(ctx).Order("created_at DESC").Find(&accounts).Error; err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	return accounts, nil
}

// GetAccountByID 按 ID 查询账户
func GetAccountByID(ctx context.Context, db *gorm.DB, id string) (*model.Account, error) {
	var a model.Account
	if err := db.WithContext(ctx).First(&a, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account: %w", err)
	}
	return &a, nil
}

// GetAccountByUsername 按用户名查询账户（登录用）
func GetAccountByUsername(ctx context.Context, db *gorm.DB, username string) (*model.Account, error) {
	var a model.Account
	if err := db.WithContext(ctx).Where("username = ?", username).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account by username: %w", err)
	}
	return &a, nil
}

// CreateAccount 创建前台账户
func CreateAccount(ctx context.Context, db *gorm.DB, a *model.Account) error {
	if err := db.WithContext(ctx).Create(a).Error; err != nil {
		return fmt.Errorf("create account: %w", err)
	}
	return nil
}

// UpdateAccount 更新指定字段
func UpdateAccount(ctx context.Context, db *gorm.DB, id string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.Account{}).
		Where("id = ?", id).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAccountNotFound
	}
	return nil
}

// DeleteAccount 删除账户
func DeleteAccount(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.Account{})
	if result.Error != nil {
		return fmt.Errorf("delete account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAccountNotFound
	}
	return nil
}
