package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrMomentNotFound 碎碎念不存在
var ErrMomentNotFound = errors.New("moment not found")

// ListMoments 列出碎碎念，按 created_at 倒序
func (s *GormStore) ListMoments(ctx context.Context) ([]model.Moment, error) {
	var moments []model.Moment
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&moments).Error; err != nil {
		return nil, fmt.Errorf("list moments: %w", err)
	}
	return moments, nil
}

// GetMoment 按 ID 查询单条碎碎念
func (s *GormStore) GetMoment(ctx context.Context, id string) (*model.Moment, error) {
	var m model.Moment
	if err := s.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMomentNotFound
		}
		return nil, fmt.Errorf("get moment: %w", err)
	}
	return &m, nil
}

// CreateMoment 创建碎碎念
func (s *GormStore) CreateMoment(ctx context.Context, m *model.Moment) error {
	if err := s.db.WithContext(ctx).Create(m).Error; err != nil {
		return fmt.Errorf("create moment: %w", err)
	}
	return nil
}

// UpdateMoment 按 ID 部分更新（类型化补丁，nil 指针字段不更新）
func (s *GormStore) UpdateMoment(ctx context.Context, id string, patch *model.MomentPatch) error {
	result := s.db.WithContext(ctx).
		Model(&model.Moment{}).
		Where("id = ?", id).
		Updates(patch)
	if result.Error != nil {
		return fmt.Errorf("update moment: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMomentNotFound
	}
	return nil
}

// DeleteMoment 按 ID 删除碎碎念
func (s *GormStore) DeleteMoment(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Moment{})
	if result.Error != nil {
		return fmt.Errorf("delete moment: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrMomentNotFound
	}
	return nil
}
