// Package model
// tag.go 标签模型（对应 data/tags.json，按 type 区分 blog/gallery）
package model

import "time"

// TagType 标签类型
type TagType string

const (
	TagTypeBlog    TagType = "blog"
	TagTypeGallery TagType = "gallery"
)

// Tag 标签，主键为 (id, type) 联合主键
type Tag struct {
	ID          string    `gorm:"primaryKey;type:text;uniqueIndex:idx_tag_pk,priority:1" json:"id"`
	Name        string    `gorm:"type:text;not null" json:"name"`
	Icon        string    `gorm:"type:text;not null;default:'default'" json:"icon"`
	Type        TagType   `gorm:"type:text;not null;uniqueIndex:idx_tag_pk,priority:2" json:"type"`
	Description string    `gorm:"type:text;default:''" json:"description"`
	LastUpdated time.Time `gorm:"not null;default:now()" json:"lastUpdated"`
}

// TagInput 创建标签入参
type TagInput struct {
	ID          string  `json:"id" binding:"required"`
	Name        string  `json:"name" binding:"required"`
	Icon        string  `json:"icon"`
	Type        TagType `json:"type" binding:"required"`
	Description string  `json:"description"`
}

// TagUpdateInput 更新标签入参
type TagUpdateInput struct {
	Name        *string `json:"name"`
	Icon        *string `json:"icon"`
	Description *string `json:"description"`
}

// TagPatch 部分更新标签的类型化补丁（指针字段，nil 表示不更新）。
type TagPatch struct {
	Name        *string    `json:"name"`
	Icon        *string    `json:"icon"`
	Description *string    `json:"description"`
	LastUpdated *time.Time `json:"-"`
}
