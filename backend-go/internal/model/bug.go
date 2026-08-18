// Package model
// bug.go Bug 报告模型（对应 data/bugs.json）
package model

import "time"

// BugStatus Bug 状态类型
type BugStatus string

const (
	BugStatusPending  BugStatus = "pending"
	BugStatusResolved BugStatus = "resolved"
)

// BugReport Bug 报告
type BugReport struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt time.Time `gorm:"not null;default:now()" json:"createdAt"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Status    BugStatus `gorm:"type:text;not null;default:'pending'" json:"status"`
	Contact   string    `gorm:"type:text;default:''" json:"contact"`
	UserAgent string    `gorm:"type:text;default:''" json:"userAgent"`
	URL       string    `gorm:"type:text;default:''" json:"url"`
}

// BugCreateInput 创建 Bug 报告入参
type BugCreateInput struct {
	Content   string `json:"content" binding:"required"`
	Contact   string `json:"contact"`
	UserAgent string `json:"userAgent"`
	URL       string `json:"url"`
}

// BugUpdateStatusInput 更新 Bug 状态入参
type BugUpdateStatusInput struct {
	Status BugStatus `json:"status" binding:"required"`
}
