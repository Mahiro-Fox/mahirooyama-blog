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
	"mahirooyama-blog/backend-go/internal/router"
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

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	router.RegisterRoutes(r, gormDB, cfg.InternalSecret, cfg.UploadsDir)

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

// autoMigrate 自动建表 + 补充索引
func autoMigrate(db *gorm.DB) error {
	// 一次性迁移所有模型
	models := []any{
		&model.Movie{},
		&model.Song{},
		&model.Moment{},
		&model.GuestbookEntry{},
		&model.BugReport{},
		&model.Account{},
		&model.AdminUser{},
		&model.RolePermission{},
		&model.Tag{},
	}
	if err := db.AutoMigrate(models...); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	// 补充 GIN 索引
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
