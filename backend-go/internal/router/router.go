package router

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/handler"
	"mahirooyama-blog/backend-go/internal/middleware"
	"mahirooyama-blog/backend-go/internal/repository"
)

// RegisterRoutes 注册所有路由（接收 Config，让 auth 处理器能读 JWT 相关配置）
func RegisterRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	if cfg == nil {
		panic("RegisterRoutes: cfg is nil")
	}

	// 数据访问单一入口。handler 层只依赖 Store 接口，便于后续注入 mock 写单测。
	store := repository.NewStore(db)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	internalSecret := cfg.InternalSecret

	// —— Auth：后台管理员 ——（登录/鉴权/登出都是公开入口；真正的权限通过 JWT+verify 判定）
	adminAuth := api.Group("/admin/auth")
	{
		adminAuth.POST("/login", handler.AdminLoginHandler(store, cfg))
		adminAuth.POST("/verify", handler.AdminVerifyHandler(store, cfg))
		adminAuth.POST("/logout", handler.AdminLogoutHandler(store, cfg))
	}

	// —— Auth：前台访客 ——
	userAuth := api.Group("/user/auth")
	{
		userAuth.POST("/login", handler.UserLoginHandler(store, cfg))
		userAuth.POST("/verify", handler.UserVerifyHandler(store, cfg))
		userAuth.POST("/logout", handler.UserLogoutHandler(store, cfg))
	}

	// movies 路由
	movies := api.Group("/movies")
	{
		movies.GET("", handler.ListMoviesHandler(store))
		movies.GET("/:id", handler.GetMovieHandler(store))
		write := movies.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMovieHandler(store))
		write.PUT("/:id", handler.UpdateMovieHandler(store))
		write.DELETE("/:id", handler.DeleteMovieHandler(store))
	}

	// midi 路由
	midiDir := filepath.Join(cfg.UploadsDir, "midisongs")
	midi := api.Group("/midi")
	{
		midi.GET("", handler.ListMidiFilesHandler(midiDir))
		midiWrite := midi.Group("", middleware.RequireInternalSecret(internalSecret))
		midiWrite.PUT("/:slug", handler.RenameMidiFileHandler(midiDir))
		midiWrite.DELETE("/:slug", handler.DeleteMidiFileHandler(midiDir))
	}

	// upload-files 路由
	uploadFiles := api.Group("/upload-files", middleware.RequireInternalSecret(internalSecret))
	{
		uploadFiles.GET("", handler.ListUploadFilesHandler(cfg.UploadsDir))
		uploadFiles.PUT("", handler.RenameFileHandler(cfg.UploadsDir))
		uploadFiles.DELETE("", handler.DeleteFileHandler(cfg.UploadsDir))
		uploadFiles.POST("/folder", handler.CreateFolderHandler(cfg.UploadsDir))
	}

	// 统一资源上传路由（各业务上传 action 复用）
	uploads := api.Group("/uploads", middleware.RequireInternalSecret(internalSecret))
	{
		uploads.POST("/asset", handler.UploadAssetHandler(cfg.UploadsDir))
	}

	// blog-files 路由
	blogDir := filepath.Join(cfg.UploadsDir, "content", "blog")
	blogFiles := api.Group("/blog-files", middleware.RequireInternalSecret(internalSecret))
	{
		blogFiles.GET("", handler.ListBlogFilesHandler(blogDir))
		blogFiles.GET("/:slug", handler.GetBlogFileHandler(blogDir))
		blogFiles.POST("", handler.CreateBlogFileHandler(blogDir))
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
		galleryFiles.PUT("/:slug", handler.UpdateGalleryFileHandler(galleryDir))
		galleryFiles.PATCH("/:slug", handler.RenameGalleryFileHandler(galleryDir))
		galleryFiles.DELETE("/:slug", handler.DeleteGalleryFileHandler(galleryDir))
	}

	// music 路由
	music := api.Group("/music")
	{
		music.GET("", handler.ListSongsHandler(store))
		music.GET("/:id", handler.GetSongHandler(store))
		write := music.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateSongHandler(store))
		write.PUT("/:id", handler.UpdateSongHandler(store))
		write.DELETE("/:id", handler.DeleteSongHandler(store))
	}

	// moments 路由
	moments := api.Group("/moments")
	{
		moments.GET("", handler.ListMomentsHandler(store))
		moments.GET("/:id", handler.GetMomentHandler(store))
		write := moments.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMomentHandler(store))
		write.PUT("/:id", handler.UpdateMomentHandler(store))
		write.DELETE("/:id", handler.DeleteMomentHandler(store))
	}

	// guestbook 路由
	guestbook := api.Group("/guestbook")
	{
		guestbook.GET("", handler.ListApprovedGuestbookHandler(store))
		guestbook.GET("/:id", handler.GetGuestbookHandler(store))
		guestbook.POST("", handler.CreateGuestbookHandler(store))
	}
	guestbookAdmin := api.Group("/admin/guestbook", middleware.RequireInternalSecret(internalSecret))
	{
		guestbookAdmin.GET("", handler.ListAllGuestbookHandler(store))
		guestbookAdmin.GET("/:id", handler.GetGuestbookHandler(store))
		guestbookAdmin.PUT("/:id", handler.UpdateGuestbookHandler(store))
		guestbookAdmin.PATCH("/:id/approve", handler.ApproveGuestbookHandler(store))
		guestbookAdmin.POST("/:id/reply", handler.ReplyGuestbookHandler(store))
		guestbookAdmin.DELETE("/:id", handler.DeleteGuestbookHandler(store))
	}

	// bugs 路由
	bugs := api.Group("/bugs")
	{
		bugs.POST("", handler.CreateBugHandler(store))
	}
	bugsAdmin := api.Group("/admin/bugs", middleware.RequireInternalSecret(internalSecret))
	{
		bugsAdmin.GET("", handler.ListBugsHandler(store))
		bugsAdmin.GET("/:id", handler.GetBugHandler(store))
		bugsAdmin.PATCH("/:id/status", handler.UpdateBugStatusHandler(store))
		bugsAdmin.DELETE("/:id", handler.DeleteBugHandler(store))
	}

	// accounts 路由
	accounts := api.Group("/accounts")
	{
		accounts.POST("", handler.CreateAccountHandler(store))
		accounts.POST("/login", handler.LoginAccountHandler(store))
		accounts.GET("/:id", handler.GetPublicAccountHandler(store)) // 新：前台公开用户资料（与 Next accounts/:id 对应）
	}
	accountsAdmin := api.Group("/admin/accounts", middleware.RequireInternalSecret(internalSecret))
	{
		accountsAdmin.GET("", handler.ListAccountsHandler(store))
		accountsAdmin.GET("/:id", handler.GetAccountHandler(store))
		accountsAdmin.POST("", handler.CreateAccountAdminHandler(store))
		accountsAdmin.PUT("/:id", handler.UpdateAccountHandler(store))
		accountsAdmin.PUT("/:id/password", handler.UpdateAccountPasswordHandler(store))
		accountsAdmin.DELETE("/:id", handler.DeleteAccountHandler(store))
	}

	// admin-users 路由
	usersLogin := api.Group("/admin/users")
	{
		usersLogin.POST("/login", handler.LoginAdminUserHandler(store))
	}
	usersAdmin := api.Group("/admin/users", middleware.RequireInternalSecret(internalSecret))
	{
		usersAdmin.GET("", handler.ListAdminUsersHandler(store))
		usersAdmin.GET("/:id", handler.GetAdminUserHandler(store))
		usersAdmin.POST("", handler.CreateAdminUserHandler(store))
		usersAdmin.PUT("/:id", handler.UpdateAdminUserHandler(store))
		usersAdmin.PUT("/:id/password", handler.UpdateAdminUserPasswordHandler(store))
		usersAdmin.DELETE("/:id", handler.DeleteAdminUserHandler(store))
	}

	// role-permissions 路由
	rolePerms := api.Group("/admin/role-permissions", middleware.RequireInternalSecret(internalSecret))
	{
		rolePerms.GET("", handler.ListRolePermissionsHandler(store))
		rolePerms.GET("/:role", handler.GetRolePermissionsHandler(store))
		rolePerms.PUT("", handler.UpdateRolePermissionsHandler(store))
		rolePerms.DELETE("/:role", handler.DeleteRolePermissionsHandler(store))
	}

	// tags 路由
	tags := api.Group("/tags")
	{
		tags.GET("", handler.ListTagsHandler(store))
		tags.GET("/:type/:id", handler.GetTagHandler(store))
	}
	tagsAdmin := api.Group("/admin/tags", middleware.RequireInternalSecret(internalSecret))
	{
		tagsAdmin.POST("", handler.CreateTagHandler(store))
		tagsAdmin.PUT("/:type/:id", handler.UpdateTagHandler(store))
		tagsAdmin.DELETE("/:type/:id", handler.DeleteTagHandler(store))
	}

	// analytics 路由
	// POST 为前端埋点公开入口（nginx /api/* 直达）；GET/DELETE 为后台管理，需内部密钥鉴权
	analytics := api.Group("/analytics")
	{
		analytics.POST("", handler.CreateAnalyticsHandler(store))
	}
	analyticsAdmin := api.Group("/admin/analytics", middleware.RequireInternalSecret(internalSecret))
	{
		analyticsAdmin.GET("", handler.GetAnalyticsLogsHandler(store))
		analyticsAdmin.DELETE("", handler.DeleteExpiredAnalyticsHandler(store))
	}
}
