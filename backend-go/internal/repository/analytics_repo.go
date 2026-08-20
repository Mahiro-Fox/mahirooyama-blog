package repository

import (
	"context"
	"fmt"
	"time"

	"mahirooyama-blog/backend-go/internal/model"
)

// analyticsListLimit 后台 GET 单次返回的最大条数（避免一次性拉全表）
const analyticsListLimit = 500

// CreateAnalyticsLog 写入一条埋点日志
func (s *GormStore) CreateAnalyticsLog(ctx context.Context, l *model.AnalyticsLog) error {
	if err := s.db.WithContext(ctx).Create(l).Error; err != nil {
		return fmt.Errorf("create analytics log: %w", err)
	}
	return nil
}

// ListAnalyticsLogs 返回最近 limit 条日志（时间倒序）
func (s *GormStore) ListAnalyticsLogs(ctx context.Context, limit int) ([]model.AnalyticsLog, error) {
	if limit <= 0 || limit > analyticsListLimit {
		limit = analyticsListLimit
	}
	var logs []model.AnalyticsLog
	if err := s.db.WithContext(ctx).
		Order("timestamp DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("list analytics logs: %w", err)
	}
	return logs, nil
}

// CountAnalyticsLogs 统计总条数
func (s *GormStore) CountAnalyticsLogs(ctx context.Context) (int64, error) {
	var n int64
	if err := s.db.WithContext(ctx).Model(&model.AnalyticsLog{}).Count(&n).Error; err != nil {
		return 0, fmt.Errorf("count analytics logs: %w", err)
	}
	return n, nil
}

// CountExpiredAnalyticsLogs 统计 timestamp 早于 before 的过期条数
func (s *GormStore) CountExpiredAnalyticsLogs(ctx context.Context, before time.Time) (int64, error) {
	var n int64
	if err := s.db.WithContext(ctx).
		Model(&model.AnalyticsLog{}).
		Where("timestamp < ?", before).
		Count(&n).Error; err != nil {
		return 0, fmt.Errorf("count expired analytics logs: %w", err)
	}
	return n, nil
}

// DeleteExpiredAnalyticsLogs 删除 timestamp 早于 before 的记录，返回删除条数
func (s *GormStore) DeleteExpiredAnalyticsLogs(ctx context.Context, before time.Time) (int64, error) {
	res := s.db.WithContext(ctx).
		Where("timestamp < ?", before).
		Delete(&model.AnalyticsLog{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete expired analytics logs: %w", res.Error)
	}
	return res.RowsAffected, nil
}