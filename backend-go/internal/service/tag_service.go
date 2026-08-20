package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListTags 列出标签，可按 type 过滤
func ListTags(ctx context.Context, store repository.Store, tagType string) ([]model.Tag, error) {
	return store.ListTags(ctx, tagType)
}

// ListAllTags 列出全部标签
func ListAllTags(ctx context.Context, store repository.Store) ([]model.Tag, error) {
	return store.ListTags(ctx, "")
}

// ListTagsByType 按类型列出标签
func ListTagsByType(ctx context.Context, store repository.Store, t model.TagType) ([]model.Tag, error) {
	return store.ListTags(ctx, string(t))
}

// GetTag 查询单个标签
func GetTag(ctx context.Context, store repository.Store, id string, tagType string) (*model.Tag, error) {
	return store.GetTag(ctx, id, tagType)
}

// CreateTag 创建标签
func CreateTag(ctx context.Context, store repository.Store, input model.TagInput) (*model.Tag, error) {
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
	if _, err := store.GetTag(ctx, id, string(input.Type)); err == nil {
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
	if err := store.CreateTag(ctx, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// UpdateTag 更新标签（不允许修改 type 和 id）
func UpdateTag(ctx context.Context, store repository.Store, id, tagType string, input model.TagUpdateInput) (*model.Tag, error) {
	if _, err := store.GetTag(ctx, id, tagType); err != nil {
		return nil, err
	}

	now := time.Now()
	patch := &model.TagPatch{LastUpdated: &now}
	if input.Name != nil {
		t := strings.TrimSpace(*input.Name)
		patch.Name = &t
	}
	if input.Icon != nil {
		patch.Icon = input.Icon
	}
	if input.Description != nil {
		patch.Description = input.Description
	}

	if err := store.UpdateTag(ctx, id, tagType, patch); err != nil {
		return nil, err
	}
	return store.GetTag(ctx, id, tagType)
}

// DeleteTag 删除标签
func DeleteTag(ctx context.Context, store repository.Store, id, tagType string) error {
	return store.DeleteTag(ctx, id, tagType)
}