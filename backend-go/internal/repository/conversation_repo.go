package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"mahirooyama-blog/backend-go/internal/model"
)

// ErrConversationNotFound 会话不存在
var ErrConversationNotFound = errors.New("conversation not found")

// UpsertConversation 按 id 写入会话。
// 冲突（已存在）时仅更新 title / messages / updated_at，保留 user_id 与 created_at。
func (s *GormStore) UpsertConversation(ctx context.Context, c *model.Conversation) error {
	if err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"title", "messages", "updated_at"}),
		}).
		Create(c).Error; err != nil {
		return fmt.Errorf("upsert conversation: %w", err)
	}
	return nil
}

// GetConversationByID 按 id 查询某用户的会话
func (s *GormStore) GetConversationByID(ctx context.Context, userID, id string) (*model.Conversation, error) {
	var c model.Conversation
	err := s.db.WithContext(ctx).
		Where("user_id = ? AND id = ?", userID, id).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrConversationNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}
	return &c, nil
}

// ListConversationSummariesByUser 按 updated_at 倒序列出某用户的会话摘要
func (s *GormStore) ListConversationSummariesByUser(ctx context.Context, userID string) ([]model.ConversationSummary, error) {
	var items []model.ConversationSummary
	if err := s.db.WithContext(ctx).
		Model(&model.Conversation{}).
		Select("id", "title", "updated_at").
		Where("user_id = ?", userID).
		Order("updated_at DESC").
		Find(&items).Error; err != nil {
		return nil, fmt.Errorf("list conversations: %w", err)
	}
	return items, nil
}

// DeleteConversation 删除某用户的会话，返回删除条数
func (s *GormStore) DeleteConversation(ctx context.Context, userID, id string) (int64, error) {
	res := s.db.WithContext(ctx).
		Where("user_id = ? AND id = ?", userID, id).
		Delete(&model.Conversation{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete conversation: %w", res.Error)
	}
	return res.RowsAffected, nil
}

// UpdateConversationTitle 更新某用户会话的标题与 updated_at，不存在返回 ErrConversationNotFound
func (s *GormStore) UpdateConversationTitle(ctx context.Context, userID, id, title string) error {
	res := s.db.WithContext(ctx).
		Model(&model.Conversation{}).
		Where("user_id = ? AND id = ?", userID, id).
		Updates(map[string]any{
			"title":      title,
			"updated_at": time.Now(),
		})
	if res.Error != nil {
		return fmt.Errorf("update conversation title: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrConversationNotFound
	}
	return nil
}