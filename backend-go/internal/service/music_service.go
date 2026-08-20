package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListSongs 列出全部音乐
func ListSongs(ctx context.Context, store repository.Store) ([]model.Song, error) {
	return store.ListSongs(ctx)
}

// GetSong 查询单个音乐
func GetSong(ctx context.Context, store repository.Store, id string) (*model.Song, error) {
	return store.GetSong(ctx, id)
}

// CreateSong 创建音乐（自动生成 UUID 作为 ID）
func CreateSong(ctx context.Context, store repository.Store, input model.SongInput) (*model.Song, error) {
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
	if err := store.CreateSong(ctx, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateSong 更新音乐
func UpdateSong(ctx context.Context, store repository.Store, id string, input model.SongUpdate) (*model.Song, error) {
	if _, err := store.GetSong(ctx, id); err != nil {
		return nil, err
	}

	patch := &model.SongPatch{}
	if input.Name != nil {
		t := strings.TrimSpace(*input.Name)
		patch.Name = &t
	}
	if input.Artist != nil {
		t := strings.TrimSpace(*input.Artist)
		patch.Artist = &t
	}
	if input.URL != nil {
		t := strings.TrimSpace(*input.URL)
		patch.URL = &t
	}
	if input.Cover != nil {
		patch.Cover = input.Cover
	}

	if patch.Name == nil && patch.Artist == nil && patch.URL == nil && patch.Cover == nil {
		return store.GetSong(ctx, id)
	}

	if err := store.UpdateSong(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetSong(ctx, id)
}

// DeleteSong 删除音乐
func DeleteSong(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteSong(ctx, id)
}
