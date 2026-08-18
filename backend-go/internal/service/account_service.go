package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListAccounts 列出全部前台账户
func ListAccounts(ctx context.Context, db *gorm.DB) ([]model.Account, error) {
	return repository.ListAccounts(ctx, db)
}

// GetAccount 按 ID 查询
func GetAccount(ctx context.Context, db *gorm.DB, id string) (*model.Account, error) {
	return repository.GetAccountByID(ctx, db, id)
}

// CreateAccount 创建前台账户（密码会被 bcrypt hash）
func CreateAccount(ctx context.Context, db *gorm.DB, input model.AccountCreateInput) (*model.Account, error) {
	if strings.TrimSpace(input.Username) == "" {
		return nil, errors.New("用户名不能为空")
	}
	if len(input.Password) < 6 {
		return nil, errors.New("密码长度不能少于 6 位")
	}

	// 用户名唯一性检查
	if _, err := repository.GetAccountByUsername(ctx, db, input.Username); err == nil {
		return nil, errors.New("用户名已被占用")
	} else if !errors.Is(err, repository.ErrAccountNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	a := model.Account{
		ID:           uuid.NewString(),
		Username:     strings.TrimSpace(input.Username),
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}
	if err := repository.CreateAccount(ctx, db, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// VerifyAccount 校验用户名密码（登录用）
func VerifyAccount(ctx context.Context, db *gorm.DB, input model.AccountLoginInput) (*model.Account, error) {
	a, err := repository.GetAccountByUsername(ctx, db, input.Username)
	if err != nil {
		if errors.Is(err, repository.ErrAccountNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}
	return a, nil
}

// UpdateAccountPassword 更新前台账户密码
func UpdateAccountPassword(ctx context.Context, db *gorm.DB, id, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("密码长度不能少于 6 位")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}
	return repository.UpdateAccount(ctx, db, id, map[string]any{
		"password_hash": string(hash),
	})
}

// DeleteAccount 删除前台账户
func DeleteAccount(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteAccount(ctx, db, id)
}
