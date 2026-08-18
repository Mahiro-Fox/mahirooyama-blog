package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/db"
	"mahirooyama-blog/backend-go/internal/model"
)

// legacyMovie 兼容旧 JSON 格式（字段名与 Go 模型可能不完全一致）
type legacyMovie struct {
	ID        string               `json:"id"`
	Title     string               `json:"title"`
	Poster    string               `json:"poster"`
	Year      string               `json:"year"`
	Tags      []string             `json:"tags"`
	Summary   string               `json:"summary"`
	CreatedAt string               `json:"created_at"`
	Sources   []model.MovieSource  `json:"sources"`
}

func main() {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	gormDB, err := db.NewGormDB(cfg)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	if err := gormDB.AutoMigrate(&model.Movie{}); err != nil {
		log.Fatalf("AutoMigrate 失败: %v", err)
	}

	jsonPath := os.Getenv("MIGRATE_SOURCE")
	if jsonPath == "" {
		jsonPath = "/data/movies.json"
	}

	log.Printf("开始迁移 %s", jsonPath)
	count, err := migrateMovies(context.Background(), gormDB, jsonPath)
	if err != nil {
		log.Fatalf("迁移失败: %v", err)
	}
	log.Printf("迁移完成，共 %d 条记录", count)
}

// migrateMovies 读取 JSON 文件并 upsert 进数据库
func migrateMovies(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}

	var legacy []legacyMovie
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}

	count := 0
	for _, l := range legacy {
		// 字段不一致处理：JSON 里 created_at 同时写入 created_at 和 updated_at
		ts, err := parseTime(l.CreatedAt)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}

		tags := l.Tags
		if tags == nil {
			tags = []string{}
		}
		sourcesJSON, _ := json.Marshal(l.Sources)

		m := model.Movie{
			ID:        strings.TrimSpace(l.ID),
			Title:     strings.TrimSpace(l.Title),
			Poster:    strings.TrimSpace(l.Poster),
			Year:      strings.TrimSpace(l.Year),
			Tags:      pq.StringArray(tags),
			Summary:   l.Summary,
			Sources:   datatypes.JSON(sourcesJSON),
			CreatedAt: ts,
			UpdatedAt: ts,
		}

		// Save = upsert（按主键 id）
		if err := db.WithContext(ctx).Save(&m).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// parseTime 尝试解析 RFC3339 时间字符串
func parseTime(s string) (time.Time, error) {
	if s == "" {
		return time.Now(), nil
	}
	return time.Parse(time.RFC3339, s)
}
