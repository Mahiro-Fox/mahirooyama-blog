package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListAccounts 列出全部前台账户
func ListAccounts(ctx context.Context, store repository.Store) ([]model.Account, error) {
	return store.ListAccounts(ctx)
}

// GetAccount 按 ID 查询
func GetAccount(ctx context.Context, store repository.Store, id string) (*model.Account, error) {
	return store.GetAccountByID(ctx, id)
}

// GetAccountByUsername 按用户名查询
func GetAccountByUsername(ctx context.Context, store repository.Store, username string) (*model.Account, error) {
	return store.GetAccountByUsername(ctx, username)
}

// GetAccountByEmail 按 email 查询（空 string 直接返回 NotFound）
func GetAccountByEmail(ctx context.Context, store repository.Store, email string) (*model.Account, error) {
	return store.GetAccountByEmail(ctx, email)
}

// CreateAccount 创建前台账户（密码会被 bcrypt hash）
func CreateAccount(ctx context.Context, store repository.Store, input model.AccountCreateInput) (*model.Account, error) {
	if strings.TrimSpace(input.Username) == "" {
		return nil, errors.New("用户名不能为空")
	}
	if len(input.Password) < 6 {
		return nil, errors.New("密码长度不能少于 6 位")
	}

	// 用户名唯一性检查
	if _, err := store.GetAccountByUsername(ctx, input.Username); err == nil {
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
	if err := store.CreateAccount(ctx, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// VerifyAccount 校验用户名密码（登录用）
func VerifyAccount(ctx context.Context, store repository.Store, input model.AccountLoginInput) (*model.Account, error) {
	a, err := store.GetAccountByUsername(ctx, input.Username)
	if err != nil {
		if errors.Is(err, repository.ErrAccountNotFound) {
			return nil, fmt.Errorf("%w", ErrInvalidCredentials)
		}
		return nil, err
	}
	// 兼容弃用的 Google 账户：password_hash 为空时直接失败
	if a.PasswordHash == "" {
		return nil, fmt.Errorf("%w", ErrInvalidCredentials)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)); err != nil {
		return nil, fmt.Errorf("%w", ErrInvalidCredentials)
	}
	return a, nil
}

// UpdateAccount 更新前台账户基本信息（用户名 / email）
// - username 不能为空，且需全局唯一（排除自身）
// - email 允许置空（nil）；非空时需全局唯一（排除自身）
// - OAuth 账户（provider != credentials）不允许改 username，避免与第三方身份脱钩
func UpdateAccount(ctx context.Context, store repository.Store, id string, input model.AccountUpdateInput) (*model.Account, error) {
	a, err := store.GetAccountByID(ctx, id)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	patch := &model.AccountPatch{LastUpdated: &now}

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
			existing, lookupErr := store.GetAccountByUsername(ctx, trimmed)
			if lookupErr == nil && existing.ID != a.ID {
				return nil, repository.ErrAccountUsernameTaken
			}
			if lookupErr != nil && !errors.Is(lookupErr, repository.ErrAccountNotFound) {
				return nil, lookupErr
			}
			patch.Username = &trimmed
		}
	}

	// email 校验（允许传 nil 或空串以清空 email）
	if input.Email != nil {
		trimmed := strings.TrimSpace(*input.Email)
		if trimmed == "" {
			empty := ""
			patch.Email = &empty
		} else if trimmed != derefString(a.Email) {
			existing, lookupErr := store.GetAccountByEmail(ctx, trimmed)
			if lookupErr == nil && existing.ID != a.ID {
				return nil, repository.ErrAccountEmailTaken
			}
			if lookupErr != nil && !errors.Is(lookupErr, repository.ErrAccountNotFound) {
				return nil, lookupErr
			}
			patch.Email = &trimmed
		}
	}

	if err := store.UpdateAccount(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetAccountByID(ctx, id)
}

// derefString 安全解引用 *string，nil 返回空串
func derefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// UpdateAccountPassword 更新前台账户密码
func UpdateAccountPassword(ctx context.Context, store repository.Store, id, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("密码长度不能少于 6 位")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}
	now := time.Now()
	hashStr := string(hash)
	return store.UpdateAccount(ctx, id, &model.AccountPatch{
		PasswordHash: &hashStr,
		LastUpdated:  &now,
	})
}

// DeleteAccount 删除前台账户
func DeleteAccount(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteAccount(ctx, id)
}
