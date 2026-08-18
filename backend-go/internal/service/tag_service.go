package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListTags 列出标签，可按 type 过滤
func ListTags(ctx context.Context, db *gorm.DB, tagType string) ([]model.Tag, error) {
	return repository.ListTags(ctx, db, tagType)
}

// ListAllTags 列出全部标签
func ListAllTags(ctx context.Context, db *gorm.DB) ([]model.Tag, error) {
	return repository.ListTags(ctx, db, "")
}

// ListTagsByType 按类型列出标签
func ListTagsByType(ctx context.Context, db *gorm.DB, t model.TagType) ([]model.Tag, error) {
	return repository.ListTags(ctx, db, string(t))
}

// GetTag 查询单个标签
func GetTag(ctx context.Context, db *gorm.DB, id string, tagType string) (*model.Tag, error) {
	return repository.GetTag(ctx, db, id, tagType)
}

// CreateTag 创建标签
func CreateTag(ctx context.Context, db *gorm.DB, input model.TagInput) (*model.Tag, error) {
	id := strings.TrimSpace(input.ID)
	if id == "" {
		return nil, errors.New("标签 ID 不能为空")
	}
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("标签名称不能为空")
	}
	if input.Type != model.TagTypeBlog && input.Type != model.TagTypeGallery {
		return nil, errors.New("标签类型必须是 blog 或 gallery")
	}

	// 检查 (id, type) 唯一性
	if _, err := repository.GetTag(ctx, db, id, string(input.Type)); err == nil {
		return nil, errors.New("标签 ID 在该类型下已存在")
	} else if !errors.Is(err, repository.ErrTagNotFound) {
		return nil, err
	}

	icon := input.Icon
	if icon == "" {
		icon = "default"
	}

	t := model.Tag{
		ID:          id,
		Name:        strings.TrimSpace(input.Name),
		Icon:        icon,
		Type:        input.Type,
		Description: input.Description,
		LastUpdated: time.Now(),
	}
	if err := repository.CreateTag(ctx, db, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// UpdateTag 更新标签（不允许修改 type 和 id）
func UpdateTag(ctx context.Context, db *gorm.DB, id, tagType string, input model.TagUpdateInput) (*model.Tag, error) {
	if _, err := repository.GetTag(ctx, db, id, tagType); err != nil {
		return nil, err
	}

	updates := map[string]any{"last_updated": time.Now()}
	if input.Name != nil {
		updates["name"] = strings.TrimSpace(*input.Name)
	}
	if input.Icon != nil {
		updates["icon"] = *input.Icon
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}

	if err := repository.UpdateTag(ctx, db, id, tagType, updates); err != nil {
		return nil, err
	}
	return repository.GetTag(ctx, db, id, tagType)
}

// DeleteTag 删除标签
func DeleteTag(ctx context.Context, db *gorm.DB, id, tagType string) error {
	return repository.DeleteTag(ctx, db, id, tagType)
}
