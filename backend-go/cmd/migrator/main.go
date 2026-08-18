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

// MIGRATE_TYPE 指定迁移类型，MIGRATE_SOURCE 指定 JSON 路径
// 支持的 MIGRATE_TYPE：
//   movies | music | moments | guestbook | bugs |
//   accounts | role-permissions | tags | admin-users
func main() {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	gormDB, err := db.NewGormDB(cfg)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	mtype := strings.TrimSpace(os.Getenv("MIGRATE_TYPE"))
	if mtype == "" {
		log.Fatal("请通过 MIGRATE_TYPE 指定迁移类型")
	}
	src := os.Getenv("MIGRATE_SOURCE")
	if src == "" {
		src = "/data/" + defaultFileName(mtype)
	}

	ctx := context.Background()

	// 1. AutoMigrate 对应表
	if err := autoMigrateFor(ctx, gormDB, mtype); err != nil {
		log.Fatalf("AutoMigrate 失败: %v", err)
	}

	log.Printf("开始迁移 type=%s source=%s", mtype, src)
	count, err := migrateFor(ctx, gormDB, mtype, src)
	if err != nil {
		log.Fatalf("迁移失败: %v", err)
	}
	log.Printf("迁移完成，共 %d 条记录", count)
}

// defaultFileName 默认 JSON 文件名映射
func defaultFileName(mtype string) string {
	switch mtype {
	case "movies":
		return "movies.json"
	case "music":
		return "music.json"
	case "moments":
		return "moments.json"
	case "guestbook":
		return "guestbook.json"
	case "bugs":
		return "bugs.json"
	case "accounts":
		return "accounts.json"
	case "role-permissions":
		return "role-permissions.json"
	case "tags":
		return "tags.json"
	case "admin-users":
		return "users.json"
	}
	return mtype + ".json"
}

// autoMigrateFor 根据类型执行 AutoMigrate
func autoMigrateFor(_ context.Context, db *gorm.DB, mtype string) error {
	var targets []any
	switch mtype {
	case "movies":
		targets = []any{&model.Movie{}}
	case "music":
		targets = []any{&model.Song{}}
	case "moments":
		targets = []any{&model.Moment{}}
	case "guestbook":
		targets = []any{&model.GuestbookEntry{}}
	case "bugs":
		targets = []any{&model.BugReport{}}
	case "accounts":
		targets = []any{&model.Account{}}
	case "role-permissions":
		targets = []any{&model.RolePermission{}}
	case "tags":
		targets = []any{&model.Tag{}}
	case "admin-users":
		targets = []any{&model.AdminUser{}}
	default:
		return fmt.Errorf("未知的 MIGRATE_TYPE: %s", mtype)
	}
	return db.AutoMigrate(targets...)
}

// migrateFor 分派到具体迁移函数
func migrateFor(ctx context.Context, db *gorm.DB, mtype, path string) (int, error) {
	switch mtype {
	case "movies":
		return migrateMovies(ctx, db, path)
	case "music":
		return migrateMusic(ctx, db, path)
	case "moments":
		return migrateMoments(ctx, db, path)
	case "guestbook":
		return migrateGuestbook(ctx, db, path)
	case "bugs":
		return migrateBugs(ctx, db, path)
	case "accounts":
		return migrateAccounts(ctx, db, path)
	case "role-permissions":
		return migrateRolePermissions(ctx, db, path)
	case "tags":
		return migrateTags(ctx, db, path)
	case "admin-users":
		return migrateAdminUsers(ctx, db, path)
	default:
		return 0, fmt.Errorf("未知的 MIGRATE_TYPE: %s", mtype)
	}
}

// ---------- movies ----------

type legacyMovie struct {
	ID        string              `json:"id"`
	Title     string              `json:"title"`
	Poster    string              `json:"poster"`
	Year      string              `json:"year"`
	Tags      []string            `json:"tags"`
	Summary   string              `json:"summary"`
	CreatedAt string              `json:"created_at"`
	Sources   []model.MovieSource `json:"sources"`
}

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
		if err := db.WithContext(ctx).Save(&m).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- music ----------

type legacySong struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Artist string `json:"artist"`
	URL    string `json:"url"`
	Cover  string `json:"cover"`
}

func migrateMusic(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacySong
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		s := model.Song{
			ID:     strings.TrimSpace(l.ID),
			Name:   strings.TrimSpace(l.Name),
			Artist: strings.TrimSpace(l.Artist),
			URL:    strings.TrimSpace(l.URL),
			Cover:  l.Cover,
		}
		if err := db.WithContext(ctx).Save(&s).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- moments ----------

type legacyMomentImage struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Ratio  int    `json:"ratio"`
}

type legacyMoment struct {
	ID        string             `json:"id"`
	CreatedAt string             `json:"createdAt"`
	Content   string             `json:"content"`
	Image     *legacyMomentImage `json:"image"`
	MoodEmoji string             `json:"moodEmoji"`
	Location  string             `json:"location"`
}

func migrateMoments(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacyMoment
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		ts, err := parseTime(l.CreatedAt)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}
		imageJSON := []byte("null")
		if l.Image != nil {
			imageJSON, _ = json.Marshal(l.Image)
		}
		m := model.Moment{
			ID:        strings.TrimSpace(l.ID),
			CreatedAt: ts,
			Content:   l.Content,
			Image:     datatypes.JSON(imageJSON),
			MoodEmoji: l.MoodEmoji,
			Location:  l.Location,
		}
		if err := db.WithContext(ctx).Save(&m).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- guestbook ----------

type legacyGuestbook struct {
	ID                         string     `json:"id"`
	CreatedAt                  string     `json:"createdAt"`
	Nickname                   string     `json:"nickname"`
	BgColor                    string     `json:"bgColor"`
	Contact                    string     `json:"contact"`
	Content                    string     `json:"content"`
	ReplyContent               string     `json:"replyContent"`
	ReplyAt                    *string    `json:"replyAt"`
	IsApproved                 bool       `json:"isApproved"`
	IsRepliedEmail             bool       `json:"isRepliedEmail"`
	IsEmailNotificationEnabled bool       `json:"isEmailNotificationEnabled"`
}

func migrateGuestbook(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacyGuestbook
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		ts, err := parseTime(l.CreatedAt)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}
		bgColor := l.BgColor
		if bgColor == "" {
			bgColor = "#FADADD"
		}
		e := model.GuestbookEntry{
			ID:                        strings.TrimSpace(l.ID),
			CreatedAt:                 ts,
			Nickname:                  l.Nickname,
			BgColor:                   bgColor,
			Contact:                   l.Contact,
			Content:                   l.Content,
			ReplyContent:              l.ReplyContent,
			IsApproved:                l.IsApproved,
			IsRepliedEmail:            l.IsRepliedEmail,
			IsEmailNotificationEnabled: l.IsEmailNotificationEnabled,
		}
		if l.ReplyAt != nil && *l.ReplyAt != "" {
			rt, err := parseTime(*l.ReplyAt)
			if err == nil {
				e.ReplyAt = &rt
			}
		}
		if err := db.WithContext(ctx).Save(&e).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- bugs ----------

type legacyBug struct {
	ID        string `json:"id"`
	CreatedAt string `json:"createdAt"`
	Content   string `json:"content"`
	Status    string `json:"status"`
	Contact   string `json:"contact"`
	UserAgent string `json:"userAgent"`
	URL       string `json:"url"`
}

func migrateBugs(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacyBug
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		ts, err := parseTime(l.CreatedAt)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}
		status := model.BugStatus(l.Status)
		if status != model.BugStatusPending && status != model.BugStatusResolved {
			status = model.BugStatusPending
		}
		b := model.BugReport{
			ID:        strings.TrimSpace(l.ID),
			CreatedAt: ts,
			Content:   l.Content,
			Status:    status,
			Contact:   l.Contact,
			UserAgent:  l.UserAgent,
			URL:        l.URL,
		}
		if err := db.WithContext(ctx).Save(&b).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- accounts ----------

type legacyAccount struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"passwordHash"`
	CreatedAt    string `json:"createdAt"`
}

func migrateAccounts(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacyAccount
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		ts, err := parseTime(l.CreatedAt)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}
		a := model.Account{
			ID:           strings.TrimSpace(l.ID),
			Username:     strings.TrimSpace(l.Username),
			PasswordHash: l.PasswordHash,
			CreatedAt:    ts,
		}
		if err := db.WithContext(ctx).Save(&a).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", l.ID, err)
		}
		count++
	}
	return count, nil
}

// ---------- role-permissions ----------

func migrateRolePermissions(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy map[string][]string
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for role, perms := range legacy {
		rp := model.RolePermission{
			Role:        role,
			Permissions: pq.StringArray(perms),
		}
		if err := db.WithContext(ctx).Save(&rp).Error; err != nil {
			return count, fmt.Errorf("保存 %s: %w", role, err)
		}
		count++
	}
	return count, nil
}

// ---------- tags ----------

type legacyTagItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Type        string `json:"type"`
	Description string `json:"description"`
	LastUpdated string `json:"lastUpdated"`
}

func migrateTags(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	// tags.json 是嵌套结构：{blog: {id: tag}, gallery: {id: tag}}
	var legacy map[string]map[string]legacyTagItem
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, tagMap := range legacy {
		for _, t := range tagMap {
			ts, err := parseTime(t.LastUpdated)
			if err != nil {
				log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", t.ID, err)
				ts = time.Now()
			}
			icon := t.Icon
			if icon == "" {
				icon = "default"
			}
			tag := model.Tag{
				ID:          strings.TrimSpace(t.ID),
				Name:        strings.TrimSpace(t.Name),
				Icon:        icon,
				Type:        model.TagType(t.Type),
				Description: t.Description,
				LastUpdated: ts,
			}
			if err := db.WithContext(ctx).Save(&tag).Error; err != nil {
				return count, fmt.Errorf("保存 %s/%s: %w", t.Type, t.ID, err)
			}
			count++
		}
	}
	return count, nil
}

// ---------- admin-users ----------

type legacyAdminUser struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Avatar             string `json:"avatar"`
	PasswordHash       string `json:"passwordHash"`
	Role               string `json:"role"`
	LastUpdated        string `json:"lastUpdated"`
	MustChangePassword bool   `json:"mustChangePassword"`
}

func migrateAdminUsers(ctx context.Context, db *gorm.DB, path string) (int, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, fmt.Errorf("读取文件: %w", err)
	}
	var legacy []legacyAdminUser
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return 0, fmt.Errorf("解析 JSON: %w", err)
	}
	count := 0
	for _, l := range legacy {
		ts, err := parseTime(l.LastUpdated)
		if err != nil {
			log.Printf("warn: ID=%s 时间解析失败 %v, 用 now() 替代", l.ID, err)
			ts = time.Now()
		}
		avatar := l.Avatar
		if avatar == "" {
			avatar = "/uploads/images/avatar/default-avatar.webp"
		}
		u := model.AdminUser{
			ID:                 strings.TrimSpace(l.ID),
			Username:           strings.TrimSpace(l.Username),
			Avatar:             avatar,
			PasswordHash:       l.PasswordHash,
			Role:               model.AdminUserRole(l.Role),
			LastUpdated:        ts,
			MustChangePassword: l.MustChangePassword,
		}
		if err := db.WithContext(ctx).Save(&u).Error; err != nil {
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
