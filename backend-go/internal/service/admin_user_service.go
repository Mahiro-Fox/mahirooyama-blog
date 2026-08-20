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

// ListAdminUsers 列出全部后台用户
func ListAdminUsers(ctx context.Context, store repository.Store) ([]model.AdminUser, error) {
	return store.ListAdminUsers(ctx)
}

// GetAdminUser 按 ID 查询
func GetAdminUser(ctx context.Context, store repository.Store, id string) (*model.AdminUser, error) {
	return store.GetAdminUserByID(ctx, id)
}

// CreateAdminUser 创建后台用户
func CreateAdminUser(ctx context.Context, store repository.Store, input model.AdminUserCreateInput) (*model.AdminUser, error) {
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
	if _, err := store.GetAdminUserByUsername(ctx, input.Username); err == nil {
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
	if err := store.CreateAdminUser(ctx, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

// VerifyAdminUser 校验后台用户登录
func VerifyAdminUser(ctx context.Context, store repository.Store, username, password string) (*model.AdminUser, error) {
	u, err := store.GetAdminUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, repository.ErrAdminUserNotFound) {
			return nil, fmt.Errorf("%w", ErrInvalidCredentials)
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("%w", ErrInvalidCredentials)
	}
	return u, nil
}

// UpdateAdminUser 更新后台用户信息
func UpdateAdminUser(ctx context.Context, store repository.Store, id string, input model.AdminUserUpdateInput) (*model.AdminUser, error) {
	if _, err := store.GetAdminUserByID(ctx, id); err != nil {
		return nil, err
	}

	now := time.Now()
	patch := &model.AdminUserPatch{LastUpdated: &now}
	if input.Username != nil {
		t := strings.TrimSpace(*input.Username)
		patch.Username = &t
	}
	if input.Avatar != nil {
		patch.Avatar = input.Avatar
	}
	if input.Role != nil {
		if *input.Role != model.AdminRoleSuperAdmin && *input.Role != model.AdminRoleUser {
			return nil, errors.New("无效的角色类型")
		}
		patch.Role = input.Role
	}

	if err := store.UpdateAdminUser(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetAdminUserByID(ctx, id)
}

// UpdateAdminUserPassword 更新后台用户密码
func UpdateAdminUserPassword(ctx context.Context, store repository.Store, id, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("密码长度不能少于 6 位")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}
	now := time.Now()
	mustChange := false
	hashStr := string(hash)
	return store.UpdateAdminUser(ctx, id, &model.AdminUserPatch{
		PasswordHash:       &hashStr,
		MustChangePassword: &mustChange,
		LastUpdated:        &now,
	})
}

// DeleteAdminUser 删除后台用户
func DeleteAdminUser(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteAdminUser(ctx, id)
}
