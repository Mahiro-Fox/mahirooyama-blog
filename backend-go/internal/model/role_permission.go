// Package model
// role_permission.go 角色权限映射（对应 data/role-permissions.json）
package model

import (
	"github.com/lib/pq"
)

// RolePermission 角色权限映射（以 role 为主键）
type RolePermission struct {
	Role        string         `gorm:"primaryKey;type:text" json:"role"`
	Permissions pq.StringArray `gorm:"type:text[];not null;default:'{}'" json:"permissions"`
}

// RolePermissionUpdateInput 更新角色权限入参
type RolePermissionUpdateInput struct {
	Role        string   `json:"role" binding:"required"`
	Permissions []string `json:"permissions" binding:"required"`
}
