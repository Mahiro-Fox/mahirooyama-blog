// Package model
// moment.go 碎碎念模型（对应 data/moments.json）
package model

import (
	"time"

	"gorm.io/datatypes"
)

// MomentImage 碎碎念图片信息（jsonb 字段）
type MomentImage struct {
	URL    string  `json:"url"`
	Width  int     `json:"width"`
	Height int     `json:"height"`
	Ratio  float64 `json:"ratio"`
}

// Moment 碎碎念模型
type Moment struct {
	ID        string         `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	Image     datatypes.JSON `gorm:"type:jsonb;default:'null'" json:"image"`
	MoodEmoji string         `gorm:"type:text;default:''" json:"moodEmoji"`
	Location  string         `gorm:"type:text;default:''" json:"location"`
}

// MomentInput 创建碎碎念的入参
type MomentInput struct {
	Content   string        `json:"content" binding:"required"`
	Image     *MomentImage  `json:"image"`
	MoodEmoji string        `json:"moodEmoji"`
	Location  string        `json:"location"`
}

// MomentUpdate 更新碎碎念的入参
type MomentUpdate struct {
	Content   *string        `json:"content"`
	Image     *MomentImage   `json:"image"`
	MoodEmoji *string        `json:"moodEmoji"`
	Location  *string        `json:"location"`
}
