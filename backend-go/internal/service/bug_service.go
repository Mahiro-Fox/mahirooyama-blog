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

// ListBugs 列出全部 Bug 报告
func ListBugs(ctx context.Context, store repository.Store) ([]model.BugReport, error) {
	return store.ListBugs(ctx)
}

// GetBug 查询单条 Bug 报告
func GetBug(ctx context.Context, store repository.Store, id string) (*model.BugReport, error) {
	return store.GetBug(ctx, id)
}

// CreateBug 创建 Bug 报告（前端用户提交）
func CreateBug(ctx context.Context, store repository.Store, input model.BugCreateInput) (*model.BugReport, error) {
	if strings.TrimSpace(input.Content) == "" {
		return nil, errors.New("Bug 内容不能为空")
	}

	b := model.BugReport{
		ID:        uuid.NewString(),
		CreatedAt: time.Now(),
		Content:   input.Content,
		Status:    model.BugStatusPending,
		Contact:   input.Contact,
		UserAgent: input.UserAgent,
		URL:       input.URL,
	}
	if err := store.CreateBug(ctx, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// UpdateBugStatus 更新 Bug 状态
func UpdateBugStatus(ctx context.Context, store repository.Store, id string, status model.BugStatus) (*model.BugReport, error) {
	if status != model.BugStatusPending && status != model.BugStatusResolved {
		return nil, errors.New("无效的状态值")
	}
	if _, err := store.GetBug(ctx, id); err != nil {
		return nil, err
	}
	if err := store.UpdateBugStatus(ctx, id, status); err != nil {
		return nil, err
	}
	return store.GetBug(ctx, id)
}

// DeleteBug 删除 Bug 报告
func DeleteBug(ctx context.Context, store repository.Store, id string) error {
	return store.DeleteBug(ctx, id)
}
