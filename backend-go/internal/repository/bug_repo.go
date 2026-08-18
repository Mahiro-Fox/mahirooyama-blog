package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrBugNotFound Bug 报告不存在
var ErrBugNotFound = errors.New("bug report not found")

// ListBugs 列出 Bug 报告，按 created_at 倒序
func ListBugs(ctx context.Context, db *gorm.DB) ([]model.BugReport, error) {
	var bugs []model.BugReport
	if err := db.WithContext(ctx).Order("created_at DESC").Find(&bugs).Error; err != nil {
		return nil, fmt.Errorf("list bugs: %w", err)
	}
	return bugs, nil
}

// GetBug 按 ID 查询单条 Bug 报告
func GetBug(ctx context.Context, db *gorm.DB, id string) (*model.BugReport, error) {
	var b model.BugReport
	if err := db.WithContext(ctx).First(&b, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBugNotFound
		}
		return nil, fmt.Errorf("get bug: %w", err)
	}
	return &b, nil
}

// CreateBug 创建 Bug 报告
func CreateBug(ctx context.Context, db *gorm.DB, b *model.BugReport) error {
	if err := db.WithContext(ctx).Create(b).Error; err != nil {
		return fmt.Errorf("create bug: %w", err)
	}
	return nil
}

// UpdateBugStatus 按 ID 更新 Bug 状态
func UpdateBugStatus(ctx context.Context, db *gorm.DB, id string, status model.BugStatus) error {
	result := db.WithContext(ctx).
		Model(&model.BugReport{}).
		Where("id = ?", id).
		Update("status", status)
	if result.Error != nil {
		return fmt.Errorf("update bug status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrBugNotFound
	}
	return nil
}

// DeleteBug 按 ID 删除 Bug 报告
func DeleteBug(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.BugReport{})
	if result.Error != nil {
		return fmt.Errorf("delete bug: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrBugNotFound
	}
	return nil
}
