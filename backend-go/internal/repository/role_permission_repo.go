package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrRoleNotFound 角色不存在
var ErrRoleNotFound = errors.New("role not found")

// ListRolePermissions 列出全部角色权限
func (s *GormStore) ListRolePermissions(ctx context.Context) ([]model.RolePermission, error) {
	var rps []model.RolePermission
	if err := s.db.WithContext(ctx).Order("role ASC").Find(&rps).Error; err != nil {
		return nil, fmt.Errorf("list role permissions: %w", err)
	}
	return rps, nil
}

// GetRolePermissions 按角色查询权限
func (s *GormStore) GetRolePermissions(ctx context.Context, role string) (*model.RolePermission, error) {
	var rp model.RolePermission
	if err := s.db.WithContext(ctx).First(&rp, "role = ?", role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("get role permissions: %w", err)
	}
	return &rp, nil
}

// UpsertRolePermissions upsert 角色权限
func (s *GormStore) UpsertRolePermissions(ctx context.Context, rp *model.RolePermission) error {
	if err := s.db.WithContext(ctx).Save(rp).Error; err != nil {
		return fmt.Errorf("upsert role permissions: %w", err)
	}
	return nil
}

// DeleteRolePermissions 删除角色权限
func (s *GormStore) DeleteRolePermissions(ctx context.Context, role string) error {
	result := s.db.WithContext(ctx).Where("role = ?", role).Delete(&model.RolePermission{})
	if result.Error != nil {
		return fmt.Errorf("delete role permissions: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRoleNotFound
	}
	return nil
}
