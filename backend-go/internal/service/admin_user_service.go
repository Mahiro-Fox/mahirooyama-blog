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

// ListAdminUsers 列出全部后台用户
func ListAdminUsers(ctx context.Context, db *gorm.DB) ([]model.AdminUser, error) {
	return repository.ListAdminUsers(ctx, db)
}

// GetAdminUser 按 ID 查询
func GetAdminUser(ctx context.Context, db *gorm.DB, id string) (*model.AdminUser, error) {
	return repository.GetAdminUserByID(ctx, db, id)
}

// CreateAdminUser 创建后台用户
func CreateAdminUser(ctx context.Context, db *gorm.DB, input model.AdminUserCreateInput) (*model.AdminUser, error) {
	if strings.TrimSpace(input.Username) == "" {
		return nil, errors.New("用户名不能为空")
	}
	if len(input.Password) < 6 {
		return nil, errors.New("密码长度不能少于 6 位")
	}
	if input.Role != model.AdminRoleSuperAdmin && input.Role != model.AdminRoleUser {
		return nil, errors.New("无效的角色类型")
	}

	// 用户名唯一性
	if _, err := repository.GetAdminUserByUsername(ctx, db, input.Username); err == nil {
		return nil, errors.New("用户名已被占用")
	} else if !errors.Is(err, repository.ErrAdminUserNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	u := model.AdminUser{
		ID:           uuid.NewString(),
		Username:     strings.TrimSpace(input.Username),
		Avatar:       "/uploads/images/avatar/default-avatar.webp",
		PasswordHash: string(hash),
		Role:         input.Role,
		LastUpdated:  time.Now(),
	}
	if err := repository.CreateAdminUser(ctx, db, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

// VerifyAdminUser 校验后台用户登录
func VerifyAdminUser(ctx context.Context, db *gorm.DB, username, password string) (*model.AdminUser, error) {
	u, err := repository.GetAdminUserByUsername(ctx, db, username)
	if err != nil {
		if errors.Is(err, repository.ErrAdminUserNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}
	return u, nil
}

// UpdateAdminUser 更新后台用户信息
func UpdateAdminUser(ctx context.Context, db *gorm.DB, id string, input model.AdminUserUpdateInput) (*model.AdminUser, error) {
	if _, err := repository.GetAdminUserByID(ctx, db, id); err != nil {
		return nil, err
	}

	updates := map[string]any{"last_updated": time.Now()}
	if input.Username != nil {
		updates["username"] = strings.TrimSpace(*input.Username)
	}
	if input.Avatar != nil {
		updates["avatar"] = *input.Avatar
	}
	if input.Role != nil {
		if *input.Role != model.AdminRoleSuperAdmin && *input.Role != model.AdminRoleUser {
			return nil, errors.New("无效的角色类型")
		}
		updates["role"] = *input.Role
	}

	if err := repository.UpdateAdminUser(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetAdminUserByID(ctx, db, id)
}

// UpdateAdminUserPassword 更新后台用户密码
func UpdateAdminUserPassword(ctx context.Context, db *gorm.DB, id, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("密码长度不能少于 6 位")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}
	return repository.UpdateAdminUser(ctx, db, id, map[string]any{
		"password_hash":         string(hash),
		"must_change_password":  false,
		"last_updated":          time.Now(),
	})
}

// DeleteAdminUser 删除后台用户
func DeleteAdminUser(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteAdminUser(ctx, db, id)
}
