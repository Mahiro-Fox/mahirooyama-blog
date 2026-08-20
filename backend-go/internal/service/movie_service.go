package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListMovies 列出公开电影
func ListMovies(ctx context.Context, store repository.Store, search, tag string) ([]model.Movie, error) {
	return store.ListMovies(ctx, search, tag)
}

// GetMovie 查询单部电影
func GetMovie(ctx context.Context, store repository.Store, id string) (*model.Movie, error) {
	return store.GetMovie(ctx, id)
}

// CreateMovie 创建电影（含必填校验和 ID 唯一性检查）
func CreateMovie(ctx context.Context, store repository.Store, input model.MovieInput) (*model.Movie, error) {
	if err := validateCreateInput(input); err != nil {
		return nil, err
	}

	// 检查 ID 是否已存在
	if _, err := store.GetMovie(ctx, strings.TrimSpace(input.ID)); err == nil {
		return nil, errors.New("该 ID 已存在，请使用其他 ID")
	} else if !errors.Is(err, repository.ErrMovieNotFound) {
		return nil, err
	}

	m := buildMovieFromInput(input)
	if err := store.CreateMovie(ctx, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// UpdateMovie 更新电影（部分字段）
func UpdateMovie(ctx context.Context, store repository.Store, id string, input model.MovieUpdate) (*model.Movie, error) {
	// 先校验存在
	if _, err := store.GetMovie(ctx, id); err != nil {
		return nil, err
	}

	updates := buildMoviePatch(input)
	if moviePatchIsEmpty(updates) {
		// 无字段需要更新，直接返回当前数据
		return store.GetMovie(ctx, id)
	}

	if err := store.UpdateMovie(ctx, id, updates); err != nil {
		return nil, err
	}
	return store.GetMovie(ctx, id)
}

// DeleteMovie 删除电影
func DeleteMovie(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteMovie(ctx, id)
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
	now := time.Now()
	return model.Movie{
		ID:        strings.TrimSpace(input.ID),
		Title:     strings.TrimSpace(input.Title),
		Poster:    strings.TrimSpace(input.Poster),
		Year:      strings.TrimSpace(input.Year),
		Tags:      pq.StringArray(tags),
		Summary:   input.Summary,
		Sources:   model.MovieSources(input.Sources),
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// buildMoviePatch 构造类型化更新补丁（只包含提供的字段，指针字段 nil 表示不更新）
func buildMoviePatch(input model.MovieUpdate) *model.MoviePatch {
	patch := &model.MoviePatch{}
	if input.Title != nil {
		t := strings.TrimSpace(*input.Title)
		patch.Title = &t
	}
	if input.Poster != nil {
		t := strings.TrimSpace(*input.Poster)
		patch.Poster = &t
	}
	if input.Year != nil {
		t := strings.TrimSpace(*input.Year)
		patch.Year = &t
	}
	if input.Tags != nil {
		t := pq.StringArray(input.Tags)
		patch.Tags = &t
	}
	if input.Summary != nil {
		patch.Summary = input.Summary
	}
	if input.Sources != nil {
		s := model.MovieSources(input.Sources)
		patch.Sources = &s
	}
	return patch
}

// moviePatchIsEmpty 判断补丁是否没有任何待更新字段
func moviePatchIsEmpty(p *model.MoviePatch) bool {
	return p.Title == nil && p.Poster == nil && p.Year == nil &&
		p.Tags == nil && p.Summary == nil && p.Sources == nil
}
