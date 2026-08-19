package router

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/handler"
	"mahirooyama-blog/backend-go/internal/middleware"
)

// RegisterRoutes 注册所有路由（接收 Config，让新的 auth 处理器能读 JWT 相关配置）
// 旧签名的字符串参数都从 cfg 里取；为了不打断调用方仍同时暴露兼容入口。
func RegisterRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	if cfg == nil {
		panic("RegisterRoutes: cfg is nil")
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	internalSecret := cfg.InternalSecret

	// —— Auth：后台管理员 ——（登录/鉴权/登出都是公开入口；真正的权限通过 JWT+verify 判定）
	adminAuth := api.Group("/admin/auth")
	{
		adminAuth.POST("/login", handler.AdminLoginHandler(db, cfg))
		adminAuth.POST("/verify", handler.AdminVerifyHandler(db, cfg))
		adminAuth.POST("/logout", handler.AdminLogoutHandler(db, cfg))
	}

	// —— Auth：前台访客 ——
	userAuth := api.Group("/user/auth")
	{
		userAuth.POST("/login", handler.UserLoginHandler(db, cfg))
		userAuth.POST("/verify", handler.UserVerifyHandler(db, cfg))
		userAuth.POST("/logout", handler.UserLogoutHandler(db, cfg))
	}

	// movies 路由
	movies := api.Group("/movies")
	{
		movies.GET("", handler.ListMoviesHandler(db))
		movies.GET("/:id", handler.GetMovieHandler(db))
		write := movies.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMovieHandler(db))
		write.PUT("/:id", handler.UpdateMovieHandler(db))
		write.DELETE("/:id", handler.DeleteMovieHandler(db))
	}

	// midi 路由
	midiDir := filepath.Join(cfg.UploadsDir, "midisongs")
	midi := api.Group("/midi")
	{
		midi.GET("", handler.ListMidiFilesHandler(midiDir))
		midiWrite := midi.Group("", middleware.RequireInternalSecret(internalSecret))
		midiWrite.POST("", handler.UploadMidiFileHandler(midiDir))
		midiWrite.PUT("/:slug", handler.RenameMidiFileHandler(midiDir))
		midiWrite.DELETE("/:slug", handler.DeleteMidiFileHandler(midiDir))
	}

	// upload-files 路由
	uploadFiles := api.Group("/upload-files", middleware.RequireInternalSecret(internalSecret))
	{
		uploadFiles.GET("", handler.ListUploadFilesHandler(cfg.UploadsDir))
		uploadFiles.POST("", handler.UploadFilesHandler(cfg.UploadsDir))
		uploadFiles.PUT("", handler.RenameFileHandler(cfg.UploadsDir))
		uploadFiles.DELETE("", handler.DeleteFileHandler(cfg.UploadsDir))
		uploadFiles.POST("/folder", handler.CreateFolderHandler(cfg.UploadsDir))
	}

	// blog-files 路由
	blogDir := filepath.Join(cfg.UploadsDir, "content", "blog")
	blogFiles := api.Group("/blog-files", middleware.RequireInternalSecret(internalSecret))
	{
		blogFiles.GET("", handler.ListBlogFilesHandler(blogDir))
		blogFiles.GET("/:slug", handler.GetBlogFileHandler(blogDir))
		blogFiles.POST("", handler.CreateBlogFileHandler(blogDir))
		blogFiles.POST("/upload", handler.UploadBlogFileHandler(blogDir))
		blogFiles.PUT("/:slug", handler.UpdateBlogFileHandler(blogDir))
		blogFiles.PATCH("/:slug", handler.RenameBlogFileHandler(blogDir))
		blogFiles.DELETE("/:slug", handler.DeleteBlogFileHandler(blogDir))
	}

	// gallery-files 路由
	galleryDir := filepath.Join(cfg.UploadsDir, "content", "gallery")
	galleryFiles := api.Group("/gallery-files", middleware.RequireInternalSecret(internalSecret))
	{
		galleryFiles.GET("", handler.ListGalleryFilesHandler(galleryDir))
		galleryFiles.GET("/:slug", handler.GetGalleryFileHandler(galleryDir))
		galleryFiles.POST("", handler.CreateGalleryFileHandler(galleryDir))
		galleryFiles.POST("/upload", handler.UploadGalleryFileHandler(galleryDir))
		galleryFiles.PUT("/:slug", handler.UpdateGalleryFileHandler(galleryDir))
		galleryFiles.PATCH("/:slug", handler.RenameGalleryFileHandler(galleryDir))
		galleryFiles.DELETE("/:slug", handler.DeleteGalleryFileHandler(galleryDir))
	}

	// music 路由
	music := api.Group("/music")
	{
		music.GET("", handler.ListSongsHandler(db))
		music.GET("/:id", handler.GetSongHandler(db))
		write := music.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateSongHandler(db))
		write.PUT("/:id", handler.UpdateSongHandler(db))
		write.DELETE("/:id", handler.DeleteSongHandler(db))
	}

	// moments 路由
	moments := api.Group("/moments")
	{
		moments.GET("", handler.ListMomentsHandler(db))
		moments.GET("/:id", handler.GetMomentHandler(db))
		write := moments.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMomentHandler(db))
		write.PUT("/:id", handler.UpdateMomentHandler(db))
		write.DELETE("/:id", handler.DeleteMomentHandler(db))
	}

	// guestbook 路由
	guestbook := api.Group("/guestbook")
	{
		guestbook.GET("", handler.ListApprovedGuestbookHandler(db))
		guestbook.GET("/:id", handler.GetGuestbookHandler(db))
		guestbook.POST("", handler.CreateGuestbookHandler(db))
	}
	guestbookAdmin := api.Group("/admin/guestbook", middleware.RequireInternalSecret(internalSecret))
	{
		guestbookAdmin.GET("", handler.ListAllGuestbookHandler(db))
		guestbookAdmin.GET("/:id", handler.GetGuestbookHandler(db))
		guestbookAdmin.PUT("/:id", handler.UpdateGuestbookHandler(db))
		guestbookAdmin.PATCH("/:id/approve", handler.ApproveGuestbookHandler(db))
		guestbookAdmin.POST("/:id/reply", handler.ReplyGuestbookHandler(db))
		guestbookAdmin.DELETE("/:id", handler.DeleteGuestbookHandler(db))
	}

	// bugs 路由
	bugs := api.Group("/bugs")
	{
		bugs.POST("", handler.CreateBugHandler(db))
	}
	bugsAdmin := api.Group("/admin/bugs", middleware.RequireInternalSecret(internalSecret))
	{
		bugsAdmin.GET("", handler.ListBugsHandler(db))
		bugsAdmin.GET("/:id", handler.GetBugHandler(db))
		bugsAdmin.PATCH("/:id/status", handler.UpdateBugStatusHandler(db))
		bugsAdmin.DELETE("/:id", handler.DeleteBugHandler(db))
	}

	// accounts 路由
	accounts := api.Group("/accounts")
	{
		accounts.POST("", handler.CreateAccountHandler(db))
		accounts.POST("/login", handler.LoginAccountHandler(db))
		accounts.GET("/:id", handler.GetPublicAccountHandler(db)) // 新：前台公开用户资料（与 Next accounts/:id 对应）
	}
	accountsAdmin := api.Group("/admin/accounts", middleware.RequireInternalSecret(internalSecret))
	{
		accountsAdmin.GET("", handler.ListAccountsHandler(db))
		accountsAdmin.GET("/:id", handler.GetAccountHandler(db))
		accountsAdmin.POST("", handler.CreateAccountAdminHandler(db))
		accountsAdmin.PUT("/:id", handler.UpdateAccountHandler(db))
		accountsAdmin.PUT("/:id/password", handler.UpdateAccountPasswordHandler(db))
		accountsAdmin.DELETE("/:id", handler.DeleteAccountHandler(db))
	}

	// admin-users 路由
	usersLogin := api.Group("/admin/users")
	{
		usersLogin.POST("/login", handler.LoginAdminUserHandler(db))
	}
	usersAdmin := api.Group("/admin/users", middleware.RequireInternalSecret(internalSecret))
	{
		usersAdmin.GET("", handler.ListAdminUsersHandler(db))
		usersAdmin.GET("/:id", handler.GetAdminUserHandler(db))
		usersAdmin.POST("", handler.CreateAdminUserHandler(db))
		usersAdmin.PUT("/:id", handler.UpdateAdminUserHandler(db))
		usersAdmin.PUT("/:id/password", handler.UpdateAdminUserPasswordHandler(db))
		usersAdmin.DELETE("/:id", handler.DeleteAdminUserHandler(db))
	}

	// role-permissions 路由
	rolePerms := api.Group("/admin/role-permissions", middleware.RequireInternalSecret(internalSecret))
	{
		rolePerms.GET("", handler.ListRolePermissionsHandler(db))
		rolePerms.GET("/:role", handler.GetRolePermissionsHandler(db))
		rolePerms.PUT("", handler.UpdateRolePermissionsHandler(db))
		rolePerms.DELETE("/:role", handler.DeleteRolePermissionsHandler(db))
	}

	// tags 路由
	tags := api.Group("/tags")
	{
		tags.GET("", handler.ListTagsHandler(db))
		tags.GET("/:type/:id", handler.GetTagHandler(db))
	}
	tagsAdmin := api.Group("/admin/tags", middleware.RequireInternalSecret(internalSecret))
	{
		tagsAdmin.POST("", handler.CreateTagHandler(db))
		tagsAdmin.PUT("/:type/:id", handler.UpdateTagHandler(db))
		tagsAdmin.DELETE("/:type/:id", handler.DeleteTagHandler(db))
	}
}

// RegisterRoutesLegacy 兼容旧调用（cmd/server/main.go 未跟上时的兜底，会 panic —— 不允许混用）
func RegisterRoutesLegacy(r *gin.Engine, db *gorm.DB, internalSecret, uploadsDir string) {
	_ = []any{r, db, internalSecret, uploadsDir}
	panic("RegisterRoutesLegacy 已废弃，请使用 RegisterRoutes(r, db, cfg) 并传入 *config.Config")
}
