// Package model
// account.go 前台用户账户模型（对应 data/accounts.json，使用 'user-session' cookie）
package model

import "time"

// AccountProvider 前台账户登录来源
type AccountProvider string

const (
	AccountProviderCredentials AccountProvider = "credentials"
	AccountProviderGoogle      AccountProvider = "google"
)

// Account 前台用户账户
type Account struct {
	ID           string          `gorm:"primaryKey;type:text" json:"id"`
	Username     string          `gorm:"type:text;not null;uniqueIndex" json:"username"`
	Email        *string         `gorm:"type:text" json:"email"`
	Provider     AccountProvider `gorm:"type:text;not null;default:'credentials';index" json:"provider"`
	PasswordHash string          `gorm:"type:text;not null" json:"-"`
	CreatedAt    time.Time       `gorm:"not null;default:now();index" json:"createdAt"`
	LastUpdated  time.Time       `gorm:"not null;default:now()" json:"lastUpdated"`
}

// PublicAccountDTO 对外（公开只读端点）暴露的账户信息（不含密码哈希）
type PublicAccountDTO struct {
	ID          string          `json:"id"`
	Username    string          `json:"username"`
	Email       *string         `json:"email"`
	Provider    AccountProvider `json:"provider"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// AccountCreateInput 注册入参
type AccountCreateInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AccountLoginInput 登录入参
type AccountLoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AccountUpdateInput 更新入参（不包含密码，密码单独接口）
type AccountUpdateInput struct {
	Username *string `json:"username"`
	Email    *string `json:"email"`
}

// AccountPatch 部分更新前台账户的类型化补丁（指针字段，nil 表示不更新）。
type AccountPatch struct {
	Username     *string    `json:"username"`
	Email        *string    `json:"email"`
	PasswordHash *string    `json:"-"`
	LastUpdated  *time.Time `json:"-"`
}
