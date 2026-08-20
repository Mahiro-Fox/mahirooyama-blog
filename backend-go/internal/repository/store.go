// Package repository
// store.go：数据访问的单一抽象入口。
// 定义 Store 接口（供 service / handler 依赖，便于注入 mock 写单测），
// 及基于 *gorm.DB 的默认实现 GormStore。
package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
)

// Store 全部持久化操作的门面接口。
// service 层只依赖本接口而非具体 *gorm.DB，因此可以注入 mock 实现。
type Store interface {
	// movies
	ListMovies(ctx context.Context, search, tag string) ([]model.Movie, error)
	GetMovie(ctx context.Context, id string) (*model.Movie, error)
	CreateMovie(ctx context.Context, m *model.Movie) error
	UpdateMovie(ctx context.Context, id string, patch *model.MoviePatch) error
	DeleteMovie(ctx context.Context, id string) error

	// moments
	ListMoments(ctx context.Context) ([]model.Moment, error)
	GetMoment(ctx context.Context, id string) (*model.Moment, error)
	CreateMoment(ctx context.Context, m *model.Moment) error
	UpdateMoment(ctx context.Context, id string, patch *model.MomentPatch) error
	DeleteMoment(ctx context.Context, id string) error

	// songs (music)
	ListSongs(ctx context.Context) ([]model.Song, error)
	GetSong(ctx context.Context, id string) (*model.Song, error)
	CreateSong(ctx context.Context, s *model.Song) error
	UpdateSong(ctx context.Context, id string, patch *model.SongPatch) error
	DeleteSong(ctx context.Context, id string) error

	// guestbook
	ListGuestbook(ctx context.Context, approvedOnly bool) ([]model.GuestbookEntry, error)
	GetGuestbook(ctx context.Context, id string) (*model.GuestbookEntry, error)
	CreateGuestbook(ctx context.Context, e *model.GuestbookEntry) error
	UpdateGuestbook(ctx context.Context, id string, patch *model.GuestbookPatch) error
	DeleteGuestbook(ctx context.Context, id string) error

	// bugs
	ListBugs(ctx context.Context) ([]model.BugReport, error)
	GetBug(ctx context.Context, id string) (*model.BugReport, error)
	CreateBug(ctx context.Context, b *model.BugReport) error
	UpdateBugStatus(ctx context.Context, id string, status model.BugStatus) error
	DeleteBug(ctx context.Context, id string) error

	// accounts (前台用户)
	ListAccounts(ctx context.Context) ([]model.Account, error)
	GetAccountByID(ctx context.Context, id string) (*model.Account, error)
	GetAccountByUsername(ctx context.Context, username string) (*model.Account, error)
	GetAccountByEmail(ctx context.Context, email string) (*model.Account, error)
	CreateAccount(ctx context.Context, a *model.Account) error
	UpdateAccount(ctx context.Context, id string, patch *model.AccountPatch) error
	DeleteAccount(ctx context.Context, id string) error

	// admin users (后台用户)
	ListAdminUsers(ctx context.Context) ([]model.AdminUser, error)
	GetAdminUserByID(ctx context.Context, id string) (*model.AdminUser, error)
	GetAdminUserByUsername(ctx context.Context, username string) (*model.AdminUser, error)
	CreateAdminUser(ctx context.Context, u *model.AdminUser) error
	UpdateAdminUser(ctx context.Context, id string, patch *model.AdminUserPatch) error
	DeleteAdminUser(ctx context.Context, id string) error

	// role permissions
	ListRolePermissions(ctx context.Context) ([]model.RolePermission, error)
	GetRolePermissions(ctx context.Context, role string) (*model.RolePermission, error)
	UpsertRolePermissions(ctx context.Context, rp *model.RolePermission) error
	DeleteRolePermissions(ctx context.Context, role string) error

	// tags
	ListTags(ctx context.Context, tagType string) ([]model.Tag, error)
	GetTag(ctx context.Context, id string, tagType string) (*model.Tag, error)
	CreateTag(ctx context.Context, t *model.Tag) error
	UpdateTag(ctx context.Context, id, tagType string, patch *model.TagPatch) error
	DeleteTag(ctx context.Context, id, tagType string) error

	// admin sessions
	CreateAdminSession(ctx context.Context, s *model.AdminSession) error
	GetAdminSessionByToken(ctx context.Context, token string) (*model.AdminSession, error)
	DeleteAdminSessionByToken(ctx context.Context, token string) error
	DeleteAdminSessionsByAdminUserID(ctx context.Context, userID string) (int64, error)
	UpdateAdminSessionLastUsedAt(ctx context.Context, token string, at time.Time) error
	DeleteExpiredAdminSessions(ctx context.Context, now time.Time) (int64, error)

	// user sessions
	CreateUserSession(ctx context.Context, s *model.UserSession) error
	GetUserSessionByToken(ctx context.Context, token string) (*model.UserSession, error)
	DeleteUserSessionByToken(ctx context.Context, token string) error
	DeleteUserSessionsByAccountID(ctx context.Context, accountID string) (int64, error)
	UpdateUserSessionLastUsedAt(ctx context.Context, token string, at time.Time) error
	DeleteExpiredUserSessions(ctx context.Context, now time.Time) (int64, error)
}

// GormStore 基于 *gorm.DB 的默认实现。
type GormStore struct {
	db *gorm.DB
}

// NewStore 用 *gorm.DB 构造 Store 实现。
func NewStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}