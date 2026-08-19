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

// GetAccountByUsername 按用户名查询
func GetAccountByUsername(ctx context.Context, db *gorm.DB, username string) (*model.Account, error) {
	return repository.GetAccountByUsername(ctx, db, username)
}

// GetAccountByEmail 按 email 查询（空 string 直接返回 NotFound）
func GetAccountByEmail(ctx context.Context, db *gorm.DB, email string) (*model.Account, error) {
	return repository.GetAccountByEmail(ctx, db, email)
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
		return nil, repository.ErrAccountUsernameTaken
	} else if !errors.Is(err, repository.ErrAccountNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	now := time.Now()
	a := model.Account{
		ID:           uuid.NewString(),
		Username:     strings.TrimSpace(input.Username),
		Email:        nil,
		Provider:     model.AccountProviderCredentials,
		PasswordHash: string(hash),
		CreatedAt:    now,
		LastUpdated:  now,
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
	// 兼容弃用的 Google 账户：password_hash 为空时直接失败
	if a.PasswordHash == "" {
		return nil, errors.New("用户名或密码错误")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}
	return a, nil
}

// UpdateAccount 更新前台账户基本信息（用户名 / email）
// - username 不能为空，且需全局唯一（排除自身）
// - email 允许置空（nil）；非空时需全局唯一（排除自身）
// - OAuth 账户（provider != credentials）不允许改 username，避免与第三方身份脱钩
func UpdateAccount(ctx context.Context, db *gorm.DB, id string, input model.AccountUpdateInput) (*model.Account, error) {
	a, err := repository.GetAccountByID(ctx, db, id)
	if err != nil {
		return nil, err
	}

	updates := map[string]any{
		"last_updated": time.Now(),
	}

	// username 校验
	if input.Username != nil {
		trimmed := strings.TrimSpace(*input.Username)
		if trimmed == "" {
			return nil, errors.New("用户名不能为空")
		}
		if a.Provider != model.AccountProviderCredentials {
			return nil, errors.New("OAuth 账户不支持修改用户名")
		}
		if trimmed != a.Username {
			existing, lookupErr := repository.GetAccountByUsername(ctx, db, trimmed)
			if lookupErr == nil && existing.ID != a.ID {
				return nil, repository.ErrAccountUsernameTaken
			}
			if lookupErr != nil && !errors.Is(lookupErr, repository.ErrAccountNotFound) {
				return nil, lookupErr
			}
			updates["username"] = trimmed
		}
	}

	// email 校验（允许传 nil 或空串以清空 email）
	if input.Email != nil {
		trimmed := strings.TrimSpace(*input.Email)
		if trimmed == "" {
			updates["email"] = nil
		} else if trimmed != derefString(a.Email) {
			existing, lookupErr := repository.GetAccountByEmail(ctx, db, trimmed)
			if lookupErr == nil && existing.ID != a.ID {
				return nil, repository.ErrAccountEmailTaken
			}
			if lookupErr != nil && !errors.Is(lookupErr, repository.ErrAccountNotFound) {
				return nil, lookupErr
			}
			updates["email"] = trimmed
		}
	}

	if err := repository.UpdateAccount(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetAccountByID(ctx, db, id)
}

// derefString 安全解引用 *string，nil 返回空串
func derefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
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
		"last_updated":  time.Now(),
	})
}

// DeleteAccount 删除前台账户
func DeleteAccount(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteAccount(ctx, db, id)
}
