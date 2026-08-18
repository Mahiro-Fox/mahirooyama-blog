// Package model
// guestbook.go 留言板模型（对应 data/guestbook.json）
package model

import "time"

// GuestbookEntry 留言板条目
type GuestbookEntry struct {
	ID                     string     `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt              time.Time  `gorm:"not null;default:now()" json:"createdAt"`
	Nickname               string     `gorm:"type:text;not null" json:"nickname"`
	BgColor                string     `gorm:"type:text;not null;default:'#FADADD'" json:"bgColor"`
	Contact                string     `gorm:"type:text;default:''" json:"contact"`
	Content                string     `gorm:"type:text;not null" json:"content"`
	ReplyContent           string     `gorm:"type:text;default:''" json:"replyContent"`
	ReplyAt                *time.Time `gorm:"type:timestamptz" json:"replyAt"`
	IsApproved             bool       `gorm:"not null;default:false" json:"isApproved"`
	IsRepliedEmail         bool       `gorm:"not null;default:false" json:"isRepliedEmail"`
	IsEmailNotificationEnabled bool    `gorm:"not null;default:false" json:"isEmailNotificationEnabled"`
}

// GuestbookCreateInput 访客提交留言
type GuestbookCreateInput struct {
	Nickname                  string `json:"nickname" binding:"required"`
	BgColor                   string `json:"bgColor" binding:"required"`
	Contact                   string `json:"contact"`
	Content                   string `json:"content" binding:"required"`
	IsEmailNotificationEnabled bool  `json:"isEmailNotificationEnabled"`
}

// GuestbookUpdateInput 管理员更新留言
type GuestbookUpdateInput struct {
	Nickname *string `json:"nickname"`
	BgColor  *string `json:"bgColor"`
	Contact  *string `json:"contact"`
	Content  *string `json:"content"`
}

// GuestbookReplyInput 管理员回复留言
type GuestbookReplyInput struct {
	ReplyContent string `json:"replyContent" binding:"required"`
}
