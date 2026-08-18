package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListGuestbook 列出留言。approvedOnly=true 时只返回已审核通过的（访客用）
func ListGuestbook(ctx context.Context, db *gorm.DB, approvedOnly bool) ([]model.GuestbookEntry, error) {
	return repository.ListGuestbook(ctx, db, approvedOnly)
}

// ListApprovedGuestbook 公开接口：只返回已审核通过
func ListApprovedGuestbook(ctx context.Context, db *gorm.DB) ([]model.GuestbookEntry, error) {
	return repository.ListGuestbook(ctx, db, true)
}

// ListAllGuestbook 管理后台：返回全部
func ListAllGuestbook(ctx context.Context, db *gorm.DB) ([]model.GuestbookEntry, error) {
	return repository.ListGuestbook(ctx, db, false)
}

// GetGuestbook 查询单条留言
func GetGuestbook(ctx context.Context, db *gorm.DB, id string) (*model.GuestbookEntry, error) {
	return repository.GetGuestbook(ctx, db, id)
}

// CreateGuestbook 访客提交留言
func CreateGuestbook(ctx context.Context, db *gorm.DB, input model.GuestbookCreateInput) (*model.GuestbookEntry, error) {
	if strings.TrimSpace(input.Nickname) == "" {
		return nil, errors.New("昵称不能为空")
	}
	if strings.TrimSpace(input.Content) == "" {
		return nil, errors.New("留言内容不能为空")
	}
	if strings.TrimSpace(input.BgColor) == "" {
		input.BgColor = "#FADADD"
	}

	e := model.GuestbookEntry{
		ID:                        uuid.NewString(),
		CreatedAt:                 time.Now(),
		Nickname:                  strings.TrimSpace(input.Nickname),
		BgColor:                   input.BgColor,
		Contact:                   input.Contact,
		Content:                   input.Content,
		IsApproved:                false,
		IsEmailNotificationEnabled: input.IsEmailNotificationEnabled,
	}
	if err := repository.CreateGuestbook(ctx, db, &e); err != nil {
		return nil, err
	}
	return &e, nil
}

// UpdateGuestbook 管理员更新留言（昵称/颜色/联系方式/内容）
func UpdateGuestbook(ctx context.Context, db *gorm.DB, id string, input model.GuestbookUpdateInput) (*model.GuestbookEntry, error) {
	if _, err := repository.GetGuestbook(ctx, db, id); err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if input.Nickname != nil {
		updates["nickname"] = *input.Nickname
	}
	if input.BgColor != nil {
		updates["bg_color"] = *input.BgColor
	}
	if input.Contact != nil {
		updates["contact"] = *input.Contact
	}
	if input.Content != nil {
		updates["content"] = *input.Content
	}

	if len(updates) == 0 {
		return repository.GetGuestbook(ctx, db, id)
	}
	if err := repository.UpdateGuestbook(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetGuestbook(ctx, db, id)
}

// ApproveGuestbook 管理员审核留言
func ApproveGuestbook(ctx context.Context, db *gorm.DB, id string, approve bool) (*model.GuestbookEntry, error) {
	if _, err := repository.GetGuestbook(ctx, db, id); err != nil {
		return nil, err
	}
	if err := repository.UpdateGuestbook(ctx, db, id, map[string]any{"is_approved": approve}); err != nil {
		return nil, err
	}
	return repository.GetGuestbook(ctx, db, id)
}

// ReplyGuestbook 管理员回复留言
func ReplyGuestbook(ctx context.Context, db *gorm.DB, id string, input model.GuestbookReplyInput) (*model.GuestbookEntry, error) {
	if _, err := repository.GetGuestbook(ctx, db, id); err != nil {
		return nil, err
	}
	now := time.Now()
	updates := map[string]any{
		"reply_content":    input.ReplyContent,
		"reply_at":         now,
		"is_replied_email": false,
	}
	if err := repository.UpdateGuestbook(ctx, db, id, updates); err != nil {
		return nil, err
	}
	return repository.GetGuestbook(ctx, db, id)
}

// DeleteGuestbook 删除留言
func DeleteGuestbook(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteGuestbook(ctx, db, id)
}
