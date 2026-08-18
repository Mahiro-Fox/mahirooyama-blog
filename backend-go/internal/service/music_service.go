package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListSongs 列出全部音乐
func ListSongs(ctx context.Context, db *gorm.DB) ([]model.Song, error) {
	return repository.ListSongs(ctx, db)
}

// GetSong 查询单个音乐
func GetSong(ctx context.Context, db *gorm.DB, id string) (*model.Song, error) {
	return repository.GetSong(ctx, db, id)
}

// CreateSong 创建音乐（自动生成 UUID 作为 ID）
func CreateSong(ctx context.Context, db *gorm.DB, input model.SongInput) (*model.Song, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("音乐名称不能为空")
	}
	if strings.TrimSpace(input.Artist) == "" {
		return nil, errors.New("音乐艺术家不能为空")
	}
	if strings.TrimSpace(input.URL) == "" {
		return nil, errors.New("音乐 URL 不能为空")
	}

	s := model.Song{
		ID:     uuid.NewString(),
		Name:   strings.TrimSpace(input.Name),
		Artist: strings.TrimSpace(input.Artist),
		URL:    strings.TrimSpace(input.URL),
		Cover:  input.Cover,
	}
	if err := repository.CreateSong(ctx, db, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateSong 更新音乐
func UpdateSong(ctx context.Context, db *gorm.DB, id string, input model.SongUpdate) (*model.Song, error) {
	if _, err := repository.GetSong(ctx, db, id); err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if input.Name != nil {
		updates["name"] = strings.TrimSpace(*input.Name)
	}
	if input.Artist != nil {
		updates["artist"] = strings.TrimSpace(*input.Artist)
	}
	if input.URL != nil {
		updates["url"] = strings.TrimSpace(*input.URL)
	}
	if input.Cover != nil {
		updates["cover"] = *input.Cover
	}

	if len(updates) == 0 {
		return repository.GetSong(ctx, db, id)
	}

	if err := repository.UpdateSong(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetSong(ctx, db, id)
}

// DeleteSong 删除音乐
func DeleteSong(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteSong(ctx, db, id)
}
