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
func ListSongs(ctx context.Context, db *gorm.DB) ([]model.Song, error) {
	var songs []model.Song
	if err := db.WithContext(ctx).Order("id ASC").Find(&songs).Error; err != nil {
		return nil, fmt.Errorf("list songs: %w", err)
	}
	return songs, nil
}

// GetSong 按 ID 查询单个音乐
func GetSong(ctx context.Context, db *gorm.DB, id string) (*model.Song, error) {
	var s model.Song
	if err := db.WithContext(ctx).First(&s, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSongNotFound
		}
		return nil, fmt.Errorf("get song: %w", err)
	}
	return &s, nil
}

// CreateSong 创建音乐
func CreateSong(ctx context.Context, db *gorm.DB, s *model.Song) error {
	if err := db.WithContext(ctx).Create(s).Error; err != nil {
		return fmt.Errorf("create song: %w", err)
	}
	return nil
}

// UpdateSong 按 ID 更新指定字段
func UpdateSong(ctx context.Context, db *gorm.DB, id string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.Song{}).
		Where("id = ?", id).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update song: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrSongNotFound
	}
	return nil
}

// DeleteSong 按 ID 删除音乐
func DeleteSong(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.Song{})
	if result.Error != nil {
		return fmt.Errorf("delete song: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrSongNotFound
	}
	return nil
}
