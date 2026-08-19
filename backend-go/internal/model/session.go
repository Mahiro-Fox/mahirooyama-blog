// Package model
// session.go：管理员会话（admin_sessions）与前台账户会话（user_sessions）的 PG 模型
package model

import "time"

// AdminSession 后台管理员会话（一条记录 = 一个 JWT token 的活跃授权）
// - Token: JWT 本身（作为 PK，长度不会超过 ~8KB，实际约 400-600 字节，text 安全）
// - AdminUserID: 关联 admin_users.id
// - SessionId: UUID，用于判断「其他设备登录把我顶下线」（单设备登录）
type AdminSession struct {
	Token       string    `gorm:"primaryKey;type:text" json:"token"`
	AdminUserID string    `gorm:"type:text;not null;index" json:"adminUserId"`
	SessionID   string    `gorm:"type:text;not null" json:"sessionId"`
	CreatedAt   time.Time `gorm:"not null;default:now()" json:"createdAt"`
	LastUsedAt  time.Time `gorm:"not null;default:now();index" json:"lastUsedAt"`
	ExpiresAt   time.Time `gorm:"not null;index" json:"expiresAt"`
	UserAgent   string    `gorm:"type:text;not null;default:''" json:"userAgent"`
	IP          string    `gorm:"type:text;not null;default:''" json:"ip"`
}

// UserSession 前台访客账户会话
type UserSession struct {
	Token       string    `gorm:"primaryKey;type:text" json:"token"`
	AccountID   string    `gorm:"type:text;not null;index" json:"accountId"`
	SessionID   string    `gorm:"type:text;not null" json:"sessionId"`
	CreatedAt   time.Time `gorm:"not null;default:now()" json:"createdAt"`
	LastUsedAt  time.Time `gorm:"not null;default:now();index" json:"lastUsedAt"`
	ExpiresAt   time.Time `gorm:"not null;index" json:"expiresAt"`
	UserAgent   string    `gorm:"type:text;not null;default:''" json:"userAgent"`
	IP          string    `gorm:"type:text;not null;default:''" json:"ip"`
}
