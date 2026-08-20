package service

import (
	"context"
	"errors"
	"strings"

	"github.com/lib/pq"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListRolePermissions 列出全部角色权限
func ListRolePermissions(ctx context.Context, store repository.Store) ([]model.RolePermission, error) {
	return store.ListRolePermissions(ctx)
}

// GetRolePermissions 按角色查询权限
func GetRolePermissions(ctx context.Context, store repository.Store, role string) (*model.RolePermission, error) {
	return store.GetRolePermissions(ctx, role)
}

// UpdateRolePermissions 更新角色权限（super_admin 不允许修改）
func UpdateRolePermissions(ctx context.Context, store repository.Store, input model.RolePermissionUpdateInput) (*model.RolePermission, error) {
	role := strings.TrimSpace(input.Role)
	if role == "" {
		return nil, errors.New("角色不能为空")
	}
	if role == "super_admin" {
		return nil, errors.New("不能修改超级管理员的权限")
	}

	rp := model.RolePermission{
		Role:        role,
		Permissions: pq.StringArray(input.Permissions),
	}
	if err := store.UpsertRolePermissions(ctx, &rp); err != nil {
		return nil, err
	}
	return store.GetRolePermissions(ctx, role)
}

// DeleteRolePermissions 删除角色权限
func DeleteRolePermissions(ctx context.Context, store repository.Store, role string) error {
	if strings.TrimSpace(role) == "super_admin" {
		return errors.New("不能删除超级管理员角色")
	}
	return store.DeleteRolePermissions(ctx, role)
}
