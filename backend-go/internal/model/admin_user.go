// Package model
// admin_user.go 后台管理员用户模型（对应 data/users.json，使用 'admin-session' cookie）
package model

import "time"

// AdminUserRole 后台用户角色
type AdminUserRole string

const (
	AdminRoleSuperAdmin AdminUserRole = "super_admin"
	AdminRoleUser      AdminUserRole = "user"
)

// AdminUser 后台管理员用户
type AdminUser struct {
	ID                string        `gorm:"primaryKey;type:text" json:"id"`
	Username          string        `gorm:"type:text;not null;uniqueIndex" json:"username"`
	Avatar            string        `gorm:"type:text;not null;default:'/uploads/images/avatar/default-avatar.webp'" json:"avatar"`
	PasswordHash      string        `gorm:"type:text;not null" json:"-"`
	Role              AdminUserRole `gorm:"type:text;not null;default:'user'" json:"role"`
	LastUpdated       time.Time     `gorm:"not null;default:now()" json:"lastUpdated"`
	MustChangePassword bool         `gorm:"not null;default:false" json:"mustChangePassword"`
}

// AdminUserCreateInput 创建后台用户入参
type AdminUserCreateInput struct {
	Username string        `json:"username" binding:"required"`
	Password string        `json:"password" binding:"required"`
	Role     AdminUserRole `json:"role" binding:"required"`
}

// AdminUserUpdateInput 更新后台用户入参（不含密码）
type AdminUserUpdateInput struct {
	Username *string        `json:"username"`
	Avatar   *string        `json:"avatar"`
	Role     *AdminUserRole `json:"role"`
}

// AdminUserPasswordUpdateInput 修改密码入参
type AdminUserPasswordUpdateInput struct {
	Password string `json:"password" binding:"required"`
}
