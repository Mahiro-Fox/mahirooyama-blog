package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// marshalMomentImage 将 MomentImage 序列化为 datatypes.JSON（nil 时返回 null）
func marshalMomentImage(img *model.MomentImage) datatypes.JSON {
	if img == nil {
		return datatypes.JSON([]byte("null"))
	}
	raw, _ := json.Marshal(img)
	return datatypes.JSON(raw)
}

// ListMoments 列出全部碎碎念
func ListMoments(ctx context.Context, db *gorm.DB) ([]model.Moment, error) {
	return repository.ListMoments(ctx, db)
}

// GetMoment 查询单条碎碎念
func GetMoment(ctx context.Context, db *gorm.DB, id string) (*model.Moment, error) {
	return repository.GetMoment(ctx, db, id)
}

// CreateMoment 创建碎碎念
func CreateMoment(ctx context.Context, db *gorm.DB, input model.MomentInput) (*model.Moment, error) {
	if strings.TrimSpace(input.Content) == "" {
		return nil, errors.New("碎碎念内容不能为空")
	}

	m := model.Moment{
		ID:        uuid.NewString(),
		CreatedAt: time.Now(),
		Content:   input.Content,
		Image:     marshalMomentImage(input.Image),
		MoodEmoji: input.MoodEmoji,
		Location:  input.Location,
	}
	if err := repository.CreateMoment(ctx, db, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// UpdateMoment 更新碎碎念
func UpdateMoment(ctx context.Context, db *gorm.DB, id string, input model.MomentUpdate) (*model.Moment, error) {
	if _, err := repository.GetMoment(ctx, db, id); err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if input.Content != nil {
		updates["content"] = *input.Content
	}
	if input.Image != nil {
		updates["image"] = marshalMomentImage(input.Image)
	}
	if input.MoodEmoji != nil {
		updates["mood_emoji"] = *input.MoodEmoji
	}
	if input.Location != nil {
		updates["location"] = *input.Location
	}

	if len(updates) == 0 {
		return repository.GetMoment(ctx, db, id)
	}

	if err := repository.UpdateMoment(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetMoment(ctx, db, id)
}

// DeleteMoment 删除碎碎念
func DeleteMoment(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteMoment(ctx, db, id)
}
