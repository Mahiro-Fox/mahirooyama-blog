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
func (s *GormStore) ListMovies(ctx context.Context, search, tag string) ([]model.Movie, error) {
	query := s.db.WithContext(ctx).Model(&model.Movie{})
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
func (s *GormStore) GetMovie(ctx context.Context, id string) (*model.Movie, error) {
	var m model.Movie
	if err := s.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMovieNotFound
		}
		return nil, fmt.Errorf("get movie: %w", err)
	}
	return &m, nil
}

// CreateMovie 创建电影
func (s *GormStore) CreateMovie(ctx context.Context, m *model.Movie) error {
	if err := s.db.WithContext(ctx).Create(m).Error; err != nil {
		return fmt.Errorf("create movie: %w", err)
	}
	return nil
}

// UpdateMovie 按 ID 部分更新（类型化补丁，nil 指针字段不更新）
func (s *GormStore) UpdateMovie(ctx context.Context, id string, patch *model.MoviePatch) error {
	result := s.db.WithContext(ctx).
		Model(&model.Movie{}).
		Where("id = ?", id).
		Updates(patch)
	if result.Error != nil {
		return fmt.Errorf("update movie: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMovieNotFound
	}
	return nil
}

// DeleteMovie 按 ID 删除电影
func (s *GormStore) DeleteMovie(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Movie{})
	if result.Error != nil {
		return fmt.Errorf("delete movie: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMovieNotFound
	}
	return nil
}
