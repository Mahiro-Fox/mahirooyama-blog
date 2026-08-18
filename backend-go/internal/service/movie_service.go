package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListMovies 列出公开电影
func ListMovies(ctx context.Context, db *gorm.DB, search, tag string) ([]model.Movie, error) {
	return repository.ListMovies(ctx, db, search, tag)
}

// GetMovie 查询单部电影
func GetMovie(ctx context.Context, db *gorm.DB, id string) (*model.Movie, error) {
	return repository.GetMovie(ctx, db, id)
}

// CreateMovie 创建电影（含必填校验和 ID 唯一性检查）
func CreateMovie(ctx context.Context, db *gorm.DB, input model.MovieInput) (*model.Movie, error) {
	if err := validateCreateInput(input); err != nil {
		return nil, err
	}

	// 检查 ID 是否已存在
	if _, err := repository.GetMovie(ctx, db, strings.TrimSpace(input.ID)); err == nil {
		return nil, errors.New("该 ID 已存在，请使用其他 ID")
	} else if !errors.Is(err, repository.ErrMovieNotFound) {
		return nil, err
	}

	m := buildMovieFromInput(input)
	if err := repository.CreateMovie(ctx, db, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// UpdateMovie 更新电影（部分字段）
func UpdateMovie(ctx context.Context, db *gorm.DB, id string, input model.MovieUpdate) (*model.Movie, error) {
	// 先校验存在
	if _, err := repository.GetMovie(ctx, db, id); err != nil {
		return nil, err
	}

	updates := buildUpdateMap(input)
	if len(updates) == 0 {
		// 无字段需要更新，直接返回当前数据
		return repository.GetMovie(ctx, db, id)
	}

	if err := repository.UpdateMovie(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetMovie(ctx, db, id)
}

// DeleteMovie 删除电影
func DeleteMovie(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteMovie(ctx, db, id)
}

// validateCreateInput 创建电影时的必填校验
func validateCreateInput(input model.MovieInput) error {
	if strings.TrimSpace(input.ID) == "" {
		return errors.New("电影 ID 不能为空")
	}
	if strings.TrimSpace(input.Title) == "" {
		return errors.New("电影标题不能为空")
	}
	if strings.TrimSpace(input.Poster) == "" {
		return errors.New("电影海报不能为空")
	}
	if strings.TrimSpace(input.Year) == "" {
		return errors.New("电影年份不能为空")
	}
	return nil
}

// buildMovieFromInput 将输入转为 Movie 模型
func buildMovieFromInput(input model.MovieInput) model.Movie {
	tags := input.Tags
	if tags == nil {
		tags = []string{}
	}
	sourcesJSON, _ := json.Marshal(input.Sources)
	now := time.Now()
	return model.Movie{
		ID:        strings.TrimSpace(input.ID),
		Title:     strings.TrimSpace(input.Title),
		Poster:    strings.TrimSpace(input.Poster),
		Year:      strings.TrimSpace(input.Year),
		Tags:      pq.StringArray(tags),
		Summary:   input.Summary,
		Sources:   datatypes.JSON(sourcesJSON),
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// buildUpdateMap 构造 GORM Updates 用的 map（只包含提供的字段）
func buildUpdateMap(input model.MovieUpdate) map[string]any {
	updates := map[string]any{}
	if input.Title != nil {
		updates["title"] = strings.TrimSpace(*input.Title)
	}
	if input.Poster != nil {
		updates["poster"] = strings.TrimSpace(*input.Poster)
	}
	if input.Year != nil {
		updates["year"] = strings.TrimSpace(*input.Year)
	}
	if input.Tags != nil {
		updates["tags"] = pq.StringArray(input.Tags)
	}
	if input.Summary != nil {
		updates["summary"] = *input.Summary
	}
	if input.Sources != nil {
		sourcesJSON, _ := json.Marshal(input.Sources)
		updates["sources"] = datatypes.JSON(sourcesJSON)
	}
	return updates
}
