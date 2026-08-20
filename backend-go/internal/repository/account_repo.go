package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrAccountNotFound 前台账户不存在
var ErrAccountNotFound = errors.New("account not found")

// ErrAccountUsernameTaken 用户名已被占用
var ErrAccountUsernameTaken = errors.New("username already taken")

// ListAccounts 列出全部前台账户（按创建时间倒序）
func (s *GormStore) ListAccounts(ctx context.Context) ([]model.Account, error) {
	var accounts []model.Account
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&accounts).Error; err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	return accounts, nil
}

// GetAccountByID 按 ID 查询账户
func (s *GormStore) GetAccountByID(ctx context.Context, id string) (*model.Account, error) {
	var a model.Account
	if err := s.db.WithContext(ctx).First(&a, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account: %w", err)
	}
	return &a, nil
}

// GetAccountByUsername 按用户名查询账户（登录用）
func (s *GormStore) GetAccountByUsername(ctx context.Context, username string) (*model.Account, error) {
	var a model.Account
	if err := s.db.WithContext(ctx).Where("username = ?", username).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account by username: %w", err)
	}
	return &a, nil
}

// ErrAccountEmailTaken Email 已被占用
var ErrAccountEmailTaken = errors.New("email already taken")

// GetAccountByEmail 按 Email 查询账户（nullable unique 索引：email 为 nil 不命中）
func (s *GormStore) GetAccountByEmail(ctx context.Context, email string) (*model.Account, error) {
	if strings.TrimSpace(email) == "" {
		return nil, ErrAccountNotFound
	}
	var a model.Account
	if err := s.db.WithContext(ctx).Where("email = ?", strings.TrimSpace(email)).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account by email: %w", err)
	}
	return &a, nil
}

// CreateAccount 创建前台账户
func (s *GormStore) CreateAccount(ctx context.Context, a *model.Account) error {
	if err := s.db.WithContext(ctx).Create(a).Error; err != nil {
		return fmt.Errorf("create account: %w", err)
	}
	return nil
}

// UpdateAccount 按 ID 部分更新（类型化补丁，nil 指针字段不更新）
func (s *GormStore) UpdateAccount(ctx context.Context, id string, patch *model.AccountPatch) error {
	result := s.db.WithContext(ctx).
		Model(&model.Account{}).
		Where("id = ?", id).
		Updates(patch)
	if result.Error != nil {
		return fmt.Errorf("update account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAccountNotFound
	}
	return nil
}

// DeleteAccount 删除账户
func (s *GormStore) DeleteAccount(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Account{})
	if result.Error != nil {
		return fmt.Errorf("delete account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAccountNotFound
	}
	return nil
}
