package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrMovieNotFound 电影不存在
var ErrMovieNotFound = errors.New("movie not found")

// ListMovies 列出电影，支持按 search/tag 过滤，按 created_at 倒序
func ListMovies(ctx context.Context, db *gorm.DB, search, tag string) ([]model.Movie, error) {
	query := db.WithContext(ctx).Model(&model.Movie{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where(
			"LOWER(title) LIKE LOWER(?) OR LOWER(summary) LIKE LOWER(?)",
			like, like,
		)
	}
	if tag != "" {
		query = query.Where("? = ANY(tags)", tag)
	}
	var movies []model.Movie
	if err := query.Order("created_at DESC").Find(&movies).Error; err != nil {
		return nil, fmt.Errorf("list movies: %w", err)
	}
	return movies, nil
}

// GetMovie 按 ID 查询单部电影
func GetMovie(ctx context.Context, db *gorm.DB, id string) (*model.Movie, error) {
	var m model.Movie
	if err := db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMovieNotFound
		}
		return nil, fmt.Errorf("get movie: %w", err)
	}
	return &m, nil
}

// CreateMovie 创建电影
func CreateMovie(ctx context.Context, db *gorm.DB, m *model.Movie) error {
	if err := db.WithContext(ctx).Create(m).Error; err != nil {
		return fmt.Errorf("create movie: %w", err)
	}
	return nil
}

// UpdateMovie 按 ID 更新指定字段（map 形式避免零值被忽略）
func UpdateMovie(ctx context.Context, db *gorm.DB, id string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.Movie{}).
		Where("id = ?", id).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update movie: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMovieNotFound
	}
	return nil
}

// DeleteMovie 按 ID 删除电影
func DeleteMovie(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.Movie{})
	if result.Error != nil {
		return fmt.Errorf("delete movie: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMovieNotFound
	}
	return nil
}
