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

// ListBugs 列出全部 Bug 报告
func ListBugs(ctx context.Context, db *gorm.DB) ([]model.BugReport, error) {
	return repository.ListBugs(ctx, db)
}

// GetBug 查询单条 Bug 报告
func GetBug(ctx context.Context, db *gorm.DB, id string) (*model.BugReport, error) {
	return repository.GetBug(ctx, db, id)
}

// CreateBug 创建 Bug 报告（前端用户提交）
func CreateBug(ctx context.Context, db *gorm.DB, input model.BugCreateInput) (*model.BugReport, error) {
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
	if err := repository.CreateBug(ctx, db, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// UpdateBugStatus 更新 Bug 状态
func UpdateBugStatus(ctx context.Context, db *gorm.DB, id string, status model.BugStatus) (*model.BugReport, error) {
	if status != model.BugStatusPending && status != model.BugStatusResolved {
		return nil, errors.New("无效的状态值")
	}
	if _, err := repository.GetBug(ctx, db, id); err != nil {
		return nil, err
	}
	if err := repository.UpdateBugStatus(ctx, db, id, status); err != nil {
		return nil, err
	}
	return repository.GetBug(ctx, db, id)
}

// DeleteBug 删除 Bug 报告
func DeleteBug(ctx context.Context, db *gorm.DB, id string) error {
	return repository.DeleteBug(ctx, db, id)
}
