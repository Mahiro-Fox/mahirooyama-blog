package model

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// MovieSource 电影播放线路
type MovieSource struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// Movie 电影数据模型（GORM 映射）
type Movie struct {
	ID        string         `gorm:"primaryKey;type:text" json:"id"`
	Title     string         `gorm:"type:text;not null" json:"title"`
	Poster    string         `gorm:"type:text;not null" json:"poster"`
	Year      string         `gorm:"type:text;not null" json:"year"`
	Tags      pq.StringArray `gorm:"type:text[];not null;default:'{}'" json:"tags"`
	Summary   string         `gorm:"type:text;not null;default:''" json:"summary"`
	Sources   datatypes.JSON `gorm:"type:jsonb;not null;default:'[]'" json:"sources"`
	CreatedAt time.Time      `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:now()" json:"updated_at"`
}

// MovieInput 创建电影的入参（id 由调用方传入）
type MovieInput struct {
	ID      string        `json:"id" binding:"required"`
	Title   string        `json:"title" binding:"required"`
	Poster  string        `json:"poster" binding:"required"`
	Year    string        `json:"year" binding:"required"`
	Tags    []string      `json:"tags"`
	Summary string        `json:"summary"`
	Sources []MovieSource `json:"sources"`
}

// MovieUpdate 更新电影的入参（指针字段区分"未提供"和"零值"）
type MovieUpdate struct {
	Title   *string        `json:"title"`
	Poster  *string        `json:"poster"`
	Year    *string        `json:"year"`
	Tags    []string       `json:"tags"`
	Summary *string        `json:"summary"`
	Sources []MovieSource  `json:"sources"`
}
