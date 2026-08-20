package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/db"
	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/router"
	"mahirooyama-blog/backend-go/internal/service"
)

func main() {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	gormDB, err := db.NewGormDB(cfg)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	if err := autoMigrate(gormDB); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}
	log.Println("数据库迁移完成")

	// 会话清理 goroutine：每 10 分钟扫一次两个 session 表，不阻塞主进程
	stopCleanup := startSessionCleaner(repository.NewStore(gormDB), 10*time.Minute)
	defer stopCleanup()

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	router.RegisterRoutes(r, gormDB, cfg)

	srv := &http.Server{
		Addr:         ":" + cfg.HTTPPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go func() {
		log.Printf("服务启动在 :%s", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务启动失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭服务...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("服务关闭异常: %v", err)
	}
	log.Println("服务已退出")
}

// startSessionCleaner 启动一个后台 goroutine，周期 t 清理两个过期会话表；
// 每次清理使用独立的单次超时，避免 DB 异常时清理永久阻塞；返回 stop 闭包
func startSessionCleaner(store repository.Store, t time.Duration) func() {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	ticker := time.NewTicker(t)
	// 单次清理超时：数据库短暂异常也不拖住，只跳过本轮
	const cleanupTimeout = 30 * time.Second
	once := func() {
		// 每次清理生成带超时的 ctx；超时/取消时由数据库驱动 context 迅速返回，不放无限等待
		rctx, rcancel := context.WithTimeout(ctx, cleanupTimeout)
		defer rcancel()
		now := time.Now()
		n1, e1 := service.CleanupExpiredAdminSessions(rctx, store, now)
		n2, e2 := service.CleanupExpiredUserSessions(rctx, store, now)
		if e1 != nil {
			log.Printf("清理 admin 过期会话失败: %v", e1)
		}
		if e2 != nil {
			log.Printf("清理 user 过期会话失败: %v", e2)
		}
		if e1 == nil && e2 == nil && (n1 > 0 || n2 > 0) {
			log.Printf("清理过期会话: admin=%d user=%d", n1, n2)
		}
	}
	go func() {
		defer close(done)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				once()
				return
			case <-ticker.C:
				once()
			}
		}
	}()
	return func() {
		cancel()
		<-done
	}
}

// autoMigrate 自动建表 + 补充索引
func autoMigrate(db *gorm.DB) error {
	models := []any{
		&model.Movie{},
		&model.Song{},
		&model.Moment{},
		&model.GuestbookEntry{},
		&model.BugReport{},
		&model.Account{},
		&model.AdminUser{},
		&model.AdminSession{},
		&model.UserSession{},
		&model.RolePermission{},
		&model.Tag{},
		&model.AnalyticsLog{},
		&model.Conversation{},
	}
	if err := db.AutoMigrate(models...); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies (created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_movies_tags_gin ON movies USING gin (tags)",
		"CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments (created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_entries (created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_guestbook_approved ON guestbook_entries (is_approved)",
		"CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bug_reports (created_at DESC)",
	}
	for _, sql := range indexes {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("create index: %w", err)
		}
	}
	return nil
}
