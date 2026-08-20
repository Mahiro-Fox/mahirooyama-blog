package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// toMomentImageData 将 MomentImage 包装为强类型 MomentImageData（nil 保持空）
func toMomentImageData(img *model.MomentImage) model.MomentImageData {
	return model.MomentImageData{Image: img}
}

// ListMoments 列出全部碎碎念
func ListMoments(ctx context.Context, store repository.Store) ([]model.Moment, error) {
	return store.ListMoments(ctx)
}

// GetMoment 查询单条碎碎念
func GetMoment(ctx context.Context, store repository.Store, id string) (*model.Moment, error) {
	return store.GetMoment(ctx, id)
}

// CreateMoment 创建碎碎念
func CreateMoment(ctx context.Context, store repository.Store, input model.MomentInput) (*model.Moment, error) {
	if strings.TrimSpace(input.Content) == "" {
		return nil, errors.New("碎碎念内容不能为空")
	}

	m := model.Moment{
		ID:        uuid.NewString(),
		CreatedAt: time.Now(),
		Content:   input.Content,
		Image:     toMomentImageData(input.Image),
		MoodEmoji: input.MoodEmoji,
		Location:  input.Location,
	}
	if err := store.CreateMoment(ctx, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// UpdateMoment 更新碎碎念
func UpdateMoment(ctx context.Context, store repository.Store, id string, input model.MomentUpdate) (*model.Moment, error) {
	if _, err := store.GetMoment(ctx, id); err != nil {
		return nil, err
	}

	patch := &model.MomentPatch{}
	if input.Content != nil {
		patch.Content = input.Content
	}
	if input.Image != nil {
		img := toMomentImageData(input.Image)
		patch.Image = &img
	}
	if input.MoodEmoji != nil {
		patch.MoodEmoji = input.MoodEmoji
	}
	if input.Location != nil {
		patch.Location = input.Location
	}

	if patch.Content == nil && patch.Image == nil && patch.MoodEmoji == nil && patch.Location == nil {
		return store.GetMoment(ctx, id)
	}

	if err := store.UpdateMoment(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetMoment(ctx, id)
}

// DeleteMoment 删除碎碎念
func DeleteMoment(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteMoment(ctx, id)
}
