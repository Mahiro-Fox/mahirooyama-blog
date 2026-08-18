// Package model
// music.go 音乐模型（对应 data/music.json）
package model

// Song 音乐模型
type Song struct {
	ID    string `gorm:"primaryKey;type:text" json:"id"`
	Name  string `gorm:"type:text;not null" json:"name"`
	Artist string `gorm:"type:text;not null" json:"artist"`
	URL   string `gorm:"type:text;not null" json:"url"`
	Cover string `gorm:"type:text;not null;default:''" json:"cover"`
}

// SongInput 创建音乐的入参
type SongInput struct {
	Name   string `json:"name" binding:"required"`
	Artist string `json:"artist" binding:"required"`
	URL    string `json:"url" binding:"required"`
	Cover  string `json:"cover"`
}

// SongUpdate 更新音乐的入参
type SongUpdate struct {
	Name   *string `json:"name"`
	Artist *string `json:"artist"`
	URL    *string `json:"url"`
	Cover  *string `json:"cover"`
}
