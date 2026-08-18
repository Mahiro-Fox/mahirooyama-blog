package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrGuestbookNotFound 留言不存在
var ErrGuestbookNotFound = errors.New("guestbook entry not found")

// ListGuestbook 列出留言，可过滤 isApproved；按 created_at 倒序
func ListGuestbook(ctx context.Context, db *gorm.DB, approvedOnly bool) ([]model.GuestbookEntry, error) {
	query := db.WithContext(ctx).Model(&model.GuestbookEntry{})
	if approvedOnly {
		query = query.Where("is_approved = ?", true)
	}
	var entries []model.GuestbookEntry
	if err := query.Order("created_at DESC").Find(&entries).Error; err != nil {
		return nil, fmt.Errorf("list guestbook: %w", err)
	}
	return entries, nil
}

// GetGuestbook 按 ID 查询单条留言
func GetGuestbook(ctx context.Context, db *gorm.DB, id string) (*model.GuestbookEntry, error) {
	var e model.GuestbookEntry
	if err := db.WithContext(ctx).First(&e, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGuestbookNotFound
		}
		return nil, fmt.Errorf("get guestbook: %w", err)
	}
	return &e, nil
}

// CreateGuestbook 创建留言
func CreateGuestbook(ctx context.Context, db *gorm.DB, e *model.GuestbookEntry) error {
	if err := db.WithContext(ctx).Create(e).Error; err != nil {
		return fmt.Errorf("create guestbook: %w", err)
	}
	return nil
}

// UpdateGuestbook 按 ID 更新指定字段
func UpdateGuestbook(ctx context.Context, db *gorm.DB, id string, updates map[string]any) error {
	result := db.WithContext(ctx).
		Model(&model.GuestbookEntry{}).
		Where("id = ?", id).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("update guestbook: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrGuestbookNotFound
	}
	return nil
}

// DeleteGuestbook 按 ID 删除留言
func DeleteGuestbook(ctx context.Context, db *gorm.DB, id string) error {
	result := db.WithContext(ctx).Where("id = ?", id).Delete(&model.GuestbookEntry{})
	if result.Error != nil {
		return fmt.Errorf("delete guestbook: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrGuestbookNotFound
	}
	return nil
}
