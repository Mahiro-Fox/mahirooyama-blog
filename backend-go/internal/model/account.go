// Package model
// account.go 前台用户账户模型（对应 data/accounts.json，使用 'user-session' cookie）
package model

import "time"

// Account 前台用户账户
type Account struct {
	ID           string    `gorm:"primaryKey;type:text" json:"id"`
	Username     string    `gorm:"type:text;not null;uniqueIndex" json:"username"`
	PasswordHash string    `gorm:"type:text;not null" json:"-"`
	CreatedAt    time.Time `gorm:"not null;default:now()" json:"createdAt"`
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
}
