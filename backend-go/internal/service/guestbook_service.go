package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// ListGuestbook 列出留言。approvedOnly=true 时只返回已审核通过的（访客用）
func ListGuestbook(ctx context.Context, store repository.Store, approvedOnly bool) ([]model.GuestbookEntry, error) {
	return store.ListGuestbook(ctx, approvedOnly)
}

// ListApprovedGuestbook 公开接口：只返回已审核通过
func ListApprovedGuestbook(ctx context.Context, store repository.Store) ([]model.GuestbookEntry, error) {
	return store.ListGuestbook(ctx, true)
}

// ListAllGuestbook 管理后台：返回全部
func ListAllGuestbook(ctx context.Context, store repository.Store) ([]model.GuestbookEntry, error) {
	return store.ListGuestbook(ctx, false)
}

// GetGuestbook 查询单条留言
func GetGuestbook(ctx context.Context, store repository.Store, id string) (*model.GuestbookEntry, error) {
	return store.GetGuestbook(ctx, id)
}

// CreateGuestbook 访客提交留言
func CreateGuestbook(ctx context.Context, store repository.Store, input model.GuestbookCreateInput) (*model.GuestbookEntry, error) {
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
	if err := store.CreateGuestbook(ctx, &e); err != nil {
		return nil, err
	}
	return &e, nil
}

// UpdateGuestbook 管理员更新留言（昵称/颜色/联系方式/内容）
func UpdateGuestbook(ctx context.Context, store repository.Store, id string, input model.GuestbookUpdateInput) (*model.GuestbookEntry, error) {
	if _, err := store.GetGuestbook(ctx, id); err != nil {
		return nil, err
	}

	patch := &model.GuestbookPatch{}
	if input.Nickname != nil {
		patch.Nickname = input.Nickname
	}
	if input.BgColor != nil {
		patch.BgColor = input.BgColor
	}
	if input.Contact != nil {
		patch.Contact = input.Contact
	}
	if input.Content != nil {
		patch.Content = input.Content
	}

	if patch.Nickname == nil && patch.BgColor == nil && patch.Contact == nil && patch.Content == nil {
		return store.GetGuestbook(ctx, id)
	}
	if err := store.UpdateGuestbook(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetGuestbook(ctx, id)
}

// ApproveGuestbook 管理员审核留言
func ApproveGuestbook(ctx context.Context, store repository.Store, id string, approve bool) (*model.GuestbookEntry, error) {
	if _, err := store.GetGuestbook(ctx, id); err != nil {
		return nil, err
	}
	if err := store.UpdateGuestbook(ctx, id, &model.GuestbookPatch{IsApproved: &approve}); err != nil {
		return nil, err
	}
	return store.GetGuestbook(ctx, id)
}

// ReplyGuestbook 管理员回复留言
func ReplyGuestbook(ctx context.Context, store repository.Store, id string, input model.GuestbookReplyInput) (*model.GuestbookEntry, error) {
	if _, err := store.GetGuestbook(ctx, id); err != nil {
		return nil, err
	}
	now := time.Now()
	repliedEmail := false
	patch := &model.GuestbookPatch{
		ReplyContent:   &input.ReplyContent,
		ReplyAt:        &now,
		IsRepliedEmail: &repliedEmail,
	}
	if err := store.UpdateGuestbook(ctx, id, patch); err != nil {
		return nil, err
	}
	return store.GetGuestbook(ctx, id)
}

// DeleteGuestbook 删除留言
func DeleteGuestbook(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteGuestbook(ctx, id)
}
