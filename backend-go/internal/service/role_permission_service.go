package service

import (
	"context"
	"errors"
	"strings"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListRolePermissions 列出全部角色权限
func ListRolePermissions(ctx context.Context, db *gorm.DB) ([]model.RolePermission, error) {
	return repository.ListRolePermissions(ctx, db)
}

// GetRolePermissions 按角色查询权限
func GetRolePermissions(ctx context.Context, db *gorm.DB, role string) (*model.RolePermission, error) {
	return repository.GetRolePermissions(ctx, db, role)
}

// UpdateRolePermissions 更新角色权限（super_admin 不允许修改）
func UpdateRolePermissions(ctx context.Context, db *gorm.DB, input model.RolePermissionUpdateInput) (*model.RolePermission, error) {
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
	if err := repository.UpsertRolePermissions(ctx, db, &rp); err != nil {
		return nil, err
	}
	return repository.GetRolePermissions(ctx, db, role)
}

// DeleteRolePermissions 删除角色权限
func DeleteRolePermissions(ctx context.Context, db *gorm.DB, role string) error {
	if strings.TrimSpace(role) == "super_admin" {
		return errors.New("不能删除超级管理员角色")
	}
	return repository.DeleteRolePermissions(ctx, db, role)
}
