package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrTagNotFound 标签不存在
var ErrTagNotFound = errors.New("tag not found")

// ListTags 列出全部标签，可按 type 过滤
func ListTags(ctx context.Context, db *gorm.DB, tagType string) ([]model.Tag, error) {
	query := db.WithContext(ctx).Model(&model.Tag{})
	if tagType != "" {
		query = query.Where("type = ?", tagType)
	}
	var tags []model.Tag
	if err := query.Order("type ASC, id ASC").Find(&tags).Error; err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	return tags, nil
}

// GetTag 按 (id, type) 查询单个标签
func GetTag(ctx context.Context, db *gorm.DB, id string, tagType string) (*model.Tag, error) {
	var t model.Tag
	if err := db.WithContext(ctx).
		Where("id = ? AND type = ?", id, tagType).
		First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTagNotFound
		}
		return nil, fmt.Errorf("get tag: %w", err)
	}
	return &t, nil
}

// CreateTag 创建标签
func CreateTag(ctx context.Context, db *gorm.DB, t *model.Tag) error {
	if err := db.WithContext(ctx).Create(t).Error; err != nil {
		return fmt.Errorf("create tag: %w", err)
	}
	return nil
}

// UpdateTag 按 (id, type) 更新指定字段
func UpdateTag(ctx context.Context, db *gorm.DB, id, tagType string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.Tag{}).
		Where("id = ? AND type = ?", id, tagType).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update tag: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrTagNotFound
	}
	return nil
}

// DeleteTag 按 (id, type) 删除标签
func DeleteTag(ctx context.Context, db *gorm.DB, id, tagType string) error {
	result := db.WithContext(ctx).
		Where("id = ? AND type = ?", id, tagType).
		Delete(&model.Tag{})
	if result.Error != nil {
		return fmt.Errorf("delete tag: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrTagNotFound
	}
	return nil
}
