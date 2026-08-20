package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrSongNotFound 音乐不存在
var ErrSongNotFound = errors.New("song not found")

// ListSongs 列出全部音乐
func (s *GormStore) ListSongs(ctx context.Context) ([]model.Song, error) {
	var songs []model.Song
	if err := s.db.WithContext(ctx).Order("id ASC").Find(&songs).Error; err != nil {
		return nil, fmt.Errorf("list songs: %w", err)
	}
	return songs, nil
}

// GetSong 按 ID 查询单个音乐
func (s *GormStore) GetSong(ctx context.Context, id string) (*model.Song, error) {
	var sng model.Song
	if err := s.db.WithContext(ctx).First(&sng, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSongNotFound
		}
		return nil, fmt.Errorf("get song: %w", err)
	}
	return &sng, nil
}

// CreateSong 创建音乐
func (s *GormStore) CreateSong(ctx context.Context, song *model.Song) error {
	if err := s.db.WithContext(ctx).Create(song).Error; err != nil {
		return fmt.Errorf("create song: %w", err)
	}
	return nil
}

// UpdateSong 按 ID 部分更新（类型化补丁，nil 指针字段不更新）
func (s *GormStore) UpdateSong(ctx context.Context, id string, patch *model.SongPatch) error {
	result := s.db.WithContext(ctx).
		Model(&model.Song{}).
		Where("id = ?", id).
		Updates(patch)
	if result.Error != nil {
		return fmt.Errorf("update song: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrSongNotFound
	}
	return nil
}

// DeleteSong 按 ID 删除音乐
func (s *GormStore) DeleteSong(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Song{})
	if result.Error != nil {
		return fmt.Errorf("delete song: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrSongNotFound
	}
	return nil
}
