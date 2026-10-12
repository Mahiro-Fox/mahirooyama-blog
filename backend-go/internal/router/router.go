package router

import (
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/config"
	"mahirooyama-blog/backend-go/internal/handler"
	"mahirooyama-blog/backend-go/internal/middleware"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// RegisterRoutes 注册所有路由（接收 Config，让 auth 处理器能读 JWT 相关配置）
func RegisterRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	if cfg == nil {
		panic("RegisterRoutes: cfg is nil")
	}

	// 数据访问单一入口。handler 层只依赖 Store 接口，便于后续注入 mock 写单测。
	store := repository.NewStore(db)

	// 云音乐 cookie 持久化初始化（幂等）
	service.InitCloudCookie(cfg.DataDir)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	internalSecret := cfg.InternalSecret
	loginLimit := middleware.RateLimit(10, 5*time.Minute)
	publicWriteLimit := middleware.RateLimit(20, 10*time.Minute)
	analyticsLimit := middleware.RateLimit(120, time.Minute)
	emailCheckLimit := middleware.RateLimit(30, time.Minute)

	// 守卫链约定：
	// 1. 公开读/公开写：显式 middleware.AllowAnonymous()，禁止隐式裸挂；
	// 2. 管理端读写：RequireInternalSecret（网络层身份确认）→ RequireSession（解析
	//    admin JWT 写入 userId/role）→ RequirePermission（查 role_permissions 表，
	//    fail-closed）。权限字符串与 Next 侧 src/constant/permissions.ts 保持一致。
	//
	// adminOnly 封装前三层守卫，组内路由再按操作挂对应 RequirePermission。
	adminOnly := func() []gin.HandlerFunc {
		return []gin.HandlerFunc{
			middleware.RequireInternalSecret(internalSecret),
			middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer),
		}
	}

	// —— Auth：后台管理员 ——（登录/鉴权/登出都是公开入口；真正的权限通过 JWT+verify 判定）
	adminAuth := api.Group("/admin/auth")
	{
		adminAuth.POST("/login", loginLimit, middleware.AllowAnonymous(), handler.AdminLoginHandler(store, cfg))
		adminAuth.POST("/verify", middleware.AllowAnonymous(), handler.AdminVerifyHandler(store, cfg))
		adminAuth.POST("/logout", middleware.AllowAnonymous(), handler.AdminLogoutHandler(store, cfg))
	}

	// —— Auth：前台访客 ——
	userAuth := api.Group("/user/auth")
	{
		userAuth.POST("/login", loginLimit, middleware.AllowAnonymous(), handler.UserLoginHandler(store, cfg))
		userAuth.POST("/verify", middleware.AllowAnonymous(), handler.UserVerifyHandler(store, cfg))
		userAuth.POST("/logout", middleware.AllowAnonymous(), handler.UserLogoutHandler(store, cfg))
	}

	// movies 路由
	movies := api.Group("/movies")
	{
		movies.GET("", middleware.AllowAnonymous(), handler.ListMoviesHandler(store))
		movies.GET("/:id", middleware.AllowAnonymous(), handler.GetMovieHandler(store))

		write := movies.Group("", adminOnly()...)
		write.POST("", middleware.RequirePermission(store, "movies:create"), handler.CreateMovieHandler(store))
		write.PUT("/:id", middleware.RequirePermission(store, "movies:update"), handler.UpdateMovieHandler(store))
		write.DELETE("/:id", middleware.RequirePermission(store, "movies:delete"), handler.DeleteMovieHandler(store))
	}

	// midi 路由
	midiDir := filepath.Join(cfg.UploadsDir, "midisongs")
	midi := api.Group("/midi")
	{
		midi.GET("", middleware.AllowAnonymous(), handler.ListMidiFilesHandler(midiDir))
		midiWrite := midi.Group("", adminOnly()...)
		midiWrite.PUT("/:slug", middleware.RequirePermission(store, "midi:update"), handler.RenameMidiFileHandler(midiDir))
		midiWrite.DELETE("/:slug", middleware.RequirePermission(store, "midi:delete"), handler.DeleteMidiFileHandler(midiDir))
	}

	// upload-files 路由（服务器文件管理）
	uploadFiles := api.Group("/upload-files", adminOnly()...)
	{
		uploadFiles.GET("", middleware.RequirePermission(store, "files:read"), handler.ListUploadFilesHandler(cfg.UploadsDir))
		uploadFiles.PUT("", middleware.RequirePermission(store, "files:update"), handler.RenameFileHandler(cfg.UploadsDir))
		uploadFiles.DELETE("", middleware.RequirePermission(store, "files:delete"), handler.DeleteFileHandler(cfg.UploadsDir))
		uploadFiles.POST("/folder", middleware.RequirePermission(store, "files:manageFolder"), handler.CreateFolderHandler(cfg.UploadsDir))
	}

	// 统一资源上传路由（各业务上传 action 复用）
	uploads := api.Group("/uploads", adminOnly()...)
	{
		uploads.POST("/asset", middleware.RequirePermission(store, "files:upload"), handler.UploadAssetHandler(cfg.UploadsDir))
	}

	// blog-files 路由
	// GET 为前台博客页公开读（仅内部密钥确认来源）；写操作走完整守卫链
	blogDir := filepath.Join(cfg.UploadsDir, "content", "blog")
	blogFiles := api.Group("/blog-files", middleware.RequireInternalSecret(internalSecret))
	{
		blogFiles.GET("", middleware.AllowAnonymous(), handler.ListBlogFilesHandler(blogDir))
		blogFiles.GET("/:slug", middleware.AllowAnonymous(), handler.GetBlogFileHandler(blogDir))
		blogFiles.POST("", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "blog:create"), handler.CreateBlogFileHandler(blogDir))
		blogFiles.PUT("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "blog:update"), handler.UpdateBlogFileHandler(blogDir))
		blogFiles.PATCH("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "blog:update"), handler.RenameBlogFileHandler(blogDir))
		blogFiles.DELETE("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "blog:delete"), handler.DeleteBlogFileHandler(blogDir))
	}

	// gallery-files 路由
	// GET 为前台图库页公开读（仅内部密钥确认来源）；写操作走完整守卫链
	galleryDir := filepath.Join(cfg.UploadsDir, "content", "gallery")
	galleryFiles := api.Group("/gallery-files", middleware.RequireInternalSecret(internalSecret))
	{
		galleryFiles.GET("", middleware.AllowAnonymous(), handler.ListGalleryFilesHandler(galleryDir))
		galleryFiles.GET("/:slug", middleware.AllowAnonymous(), handler.GetGalleryFileHandler(galleryDir))
		galleryFiles.POST("", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "gallery:create"), handler.CreateGalleryFileHandler(galleryDir))
		galleryFiles.PUT("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "gallery:update"), handler.UpdateGalleryFileHandler(galleryDir))
		galleryFiles.PATCH("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "gallery:update"), handler.RenameGalleryFileHandler(galleryDir))
		galleryFiles.DELETE("/:slug", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "gallery:delete"), handler.DeleteGalleryFileHandler(galleryDir))
	}

	// music 路由
	music := api.Group("/music")
	{
		music.GET("", middleware.AllowAnonymous(), handler.ListSongsHandler(store))
		music.GET("/:id", middleware.AllowAnonymous(), handler.GetSongHandler(store))
		write := music.Group("", adminOnly()...)
		write.POST("", middleware.RequirePermission(store, "music:create"), handler.CreateSongHandler(store))
		write.PUT("/:id", middleware.RequirePermission(store, "music:update"), handler.UpdateSongHandler(store))
		write.DELETE("/:id", middleware.RequirePermission(store, "music:delete"), handler.DeleteSongHandler(store))
	}

	// moments 路由
	moments := api.Group("/moments")
	{
		moments.GET("", middleware.AllowAnonymous(), handler.ListMomentsHandler(store))
		moments.GET("/:id", middleware.AllowAnonymous(), handler.GetMomentHandler(store))
		write := moments.Group("", adminOnly()...)
		write.POST("", middleware.RequirePermission(store, "moments:create"), handler.CreateMomentHandler(store))
		write.PUT("/:id", middleware.RequirePermission(store, "moments:update"), handler.UpdateMomentHandler(store))
		write.DELETE("/:id", middleware.RequirePermission(store, "moments:delete"), handler.DeleteMomentHandler(store))
	}

	// guestbook 路由（前台公开浏览 + 匿名留言）
	guestbook := api.Group("/guestbook")
	{
		guestbook.GET("", middleware.AllowAnonymous(), handler.ListApprovedGuestbookHandler(store))
		guestbook.GET("/:id", middleware.AllowAnonymous(), handler.GetGuestbookHandler(store))
		guestbook.POST("", publicWriteLimit, middleware.AllowAnonymous(), handler.CreateGuestbookHandler(store))
	}
	guestbookAdmin := api.Group("/admin/guestbook", adminOnly()...)
	{
		guestbookAdmin.GET("", middleware.RequirePermission(store, "guestbook:read"), handler.ListAllGuestbookHandler(store))
		guestbookAdmin.GET("/:id", middleware.RequirePermission(store, "guestbook:read"), handler.GetGuestbookHandler(store))
		guestbookAdmin.PUT("/:id", middleware.RequirePermission(store, "guestbook:update"), handler.UpdateGuestbookHandler(store))
		guestbookAdmin.PATCH("/:id/approve", middleware.RequirePermission(store, "guestbook:approve"), handler.ApproveGuestbookHandler(store))
		guestbookAdmin.POST("/:id/reply", middleware.RequirePermission(store, "guestbook:update"), handler.ReplyGuestbookHandler(store))
		guestbookAdmin.DELETE("/:id", middleware.RequirePermission(store, "guestbook:delete"), handler.DeleteGuestbookHandler(store))
	}

	// bugs 路由（前台匿名提交 BUG）
	bugs := api.Group("/bugs")
	{
		bugs.POST("", publicWriteLimit, middleware.AllowAnonymous(), handler.CreateBugHandler(store))
	}
	bugsAdmin := api.Group("/admin/bugs", adminOnly()...)
	{
		bugsAdmin.GET("", middleware.RequirePermission(store, "bugs:read"), handler.ListBugsHandler(store))
		bugsAdmin.GET("/:id", middleware.RequirePermission(store, "bugs:read"), handler.GetBugHandler(store))
		bugsAdmin.PATCH("/:id/status", middleware.RequirePermission(store, "bugs:update"), handler.UpdateBugStatusHandler(store))
		bugsAdmin.DELETE("/:id", middleware.RequirePermission(store, "bugs:delete"), handler.DeleteBugHandler(store))
	}

	// accounts 路由（前台注册/登录/公开资料）
	accounts := api.Group("/accounts")
	{
		accounts.POST("", publicWriteLimit, middleware.AllowAnonymous(), handler.CreateAccountHandler(store))
		accounts.POST("/login", loginLimit, middleware.AllowAnonymous(), handler.LoginAccountHandler(store))
		accounts.GET("/exists", emailCheckLimit, middleware.AllowAnonymous(), handler.CheckAccountEmailExistsHandler(store))
		accounts.GET("/:id", middleware.AllowAnonymous(), handler.GetPublicAccountHandler(store))
	}
	accountsAdmin := api.Group("/admin/accounts", adminOnly()...)
	{
		accountsAdmin.GET("", middleware.RequirePermission(store, "accounts:read"), handler.ListAccountsHandler(store))
		accountsAdmin.GET("/:id", middleware.RequirePermission(store, "accounts:read"), handler.GetAccountHandler(store))
		accountsAdmin.POST("", middleware.RequirePermission(store, "accounts:create"), handler.CreateAccountAdminHandler(store))
		accountsAdmin.PUT("/:id", middleware.RequirePermission(store, "accounts:update"), handler.UpdateAccountHandler(store))
		accountsAdmin.PUT("/:id/password", middleware.RequirePermission(store, "accounts:updatePassword"), handler.UpdateAccountPasswordHandler(store))
		accountsAdmin.DELETE("/:id", middleware.RequirePermission(store, "accounts:delete"), handler.DeleteAccountHandler(store))
	}

	// admin-users 路由
	usersLogin := api.Group("/admin/users")
	{
		usersLogin.POST("/login", loginLimit, middleware.AllowAnonymous(), handler.LoginAdminUserHandler(store))
	}
	usersAdmin := api.Group("/admin/users", adminOnly()...)
	{
		usersAdmin.GET("", middleware.RequirePermission(store, "users:read"), handler.ListAdminUsersHandler(store))
		usersAdmin.GET("/:id", middleware.RequirePermission(store, "users:read"), handler.GetAdminUserHandler(store))
		usersAdmin.POST("", middleware.RequirePermission(store, "users:create"), handler.CreateAdminUserHandler(store))
		usersAdmin.PUT("/:id", middleware.RequirePermission(store, "users:update"), handler.UpdateAdminUserHandler(store))
		usersAdmin.PUT("/:id/password", middleware.RequirePermission(store, "users:updatePassword"), handler.UpdateAdminUserPasswordHandler(store))
		usersAdmin.DELETE("/:id", middleware.RequirePermission(store, "users:delete"), handler.DeleteAdminUserHandler(store))
	}

	// role-permissions 路由
	// GET 是权限系统的引导数据：Next 侧 requirePermission 自身依赖它做内存缓存，
	// 若要求会话会形成"鉴权前要先鉴权"的循环，故 GET 仅需内部密钥（显式匿名）。
	// 写操作走完整守卫链，仅 super_admin（users:updateRole）可改。
	rolePerms := api.Group("/admin/role-permissions", middleware.RequireInternalSecret(internalSecret))
	{
		rolePerms.GET("", middleware.AllowAnonymous(), handler.ListRolePermissionsHandler(store))
		rolePerms.GET("/:role", middleware.AllowAnonymous(), handler.GetRolePermissionsHandler(store))
		rolePerms.PUT("", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "users:updateRole"), handler.UpdateRolePermissionsHandler(store))
		rolePerms.DELETE("/:role", middleware.RequireSession(cfg.JWTSecret, cfg.AdminIssuer), middleware.RequirePermission(store, "users:updateRole"), handler.DeleteRolePermissionsHandler(store))
	}

	// tags 路由
	tags := api.Group("/tags")
	{
		tags.GET("", middleware.AllowAnonymous(), handler.ListTagsHandler(store))
		tags.GET("/:type/:id", middleware.AllowAnonymous(), handler.GetTagHandler(store))
	}
	tagsAdmin := api.Group("/admin/tags", adminOnly()...)
	{
		tagsAdmin.POST("", middleware.RequirePermission(store, "tag:create"), handler.CreateTagHandler(store))
		tagsAdmin.PUT("/:type/:id", middleware.RequirePermission(store, "tag:update"), handler.UpdateTagHandler(store))
		tagsAdmin.DELETE("/:type/:id", middleware.RequirePermission(store, "tag:delete"), handler.DeleteTagHandler(store))
	}

	// analytics 路由
	// POST 为前端埋点公开入口（nginx /api/* 直达）；GET/DELETE 为后台管理
	analytics := api.Group("/analytics")
	{
		analytics.POST("", analyticsLimit, middleware.AllowAnonymous(), handler.CreateAnalyticsHandler(store))
	}
	analyticsAdmin := api.Group("/admin/analytics", adminOnly()...)
	{
		analyticsAdmin.GET("", middleware.RequirePermission(store, "analytics:read"), handler.GetAnalyticsLogsHandler(store))
		analyticsAdmin.DELETE("", middleware.RequirePermission(store, "analytics:delete"), handler.DeleteExpiredAnalyticsHandler(store))
	}

	// conversations 路由（AI 对话存储）
	// AI 对话逻辑仍在前端 Next 侧，本组仅负责落盘与读取，仅需内部密钥。
	// 身份模型：前台 user-session 与 admin JWT 是不同 issuer，Next 在调用前已完成
	// 用户鉴权并显式透传 userId 做数据隔离，故这里不挂 RequireSession。
	conversations := api.Group("/conversations", middleware.RequireInternalSecret(internalSecret))
	{
		conversations.GET("", middleware.AllowAnonymous(), handler.ListConversationsHandler(store))
		conversations.PUT("/:id", middleware.AllowAnonymous(), handler.UpsertConversationHandler(store))
		conversations.GET("/:id", middleware.AllowAnonymous(), handler.GetConversationHandler(store))
		conversations.PATCH("/:id", middleware.AllowAnonymous(), handler.UpdateConversationTitleHandler(store))
		conversations.DELETE("/:id", middleware.AllowAnonymous(), handler.DeleteConversationHandler(store))
	}

	// —— 云音乐（网易云 / QQ）—— 公开读显式匿名；cookie 读写为站点级配置，
	// 由 Next Server Action 转发（内部密钥确认），不绑定具体管理员会话 ——
	cloudmusic := api.Group("/cloudmusic")
	{
		// 网易云公开读
		netease := cloudmusic.Group("/netease")
		{
			netease.GET("/search", middleware.AllowAnonymous(), handler.NeteaseSearchHandler())
			netease.GET("/playable", middleware.AllowAnonymous(), handler.NeteasePlayableHandler())
			netease.GET("/account", middleware.AllowAnonymous(), handler.NeteaseAccountHandler())
			netease.GET("/daily", middleware.AllowAnonymous(), handler.NeteaseDailyHandler())
			netease.GET("/playlists", middleware.AllowAnonymous(), handler.NeteasePlaylistsHandler())
			netease.GET("/playlist", middleware.AllowAnonymous(), handler.NeteasePlaylistHandler())
			netease.GET("/lyric", middleware.AllowAnonymous(), handler.NeteaseLyricHandler())
			netease.GET("/audio", middleware.AllowAnonymous(), handler.NeteaseAudioHandler())
			netease.GET("/qr/key", middleware.AllowAnonymous(), handler.NeteaseQRKeyHandler())
		}
		// QQ 公开读
		qq := cloudmusic.Group("/qq")
		{
			qq.GET("/search", middleware.AllowAnonymous(), handler.QQSearchHandler())
			qq.GET("/songurl", middleware.AllowAnonymous(), handler.QQSongURLHandler())
			qq.GET("/profile", middleware.AllowAnonymous(), handler.QQProfileHandler())
			qq.GET("/user/playlists", middleware.AllowAnonymous(), handler.QQUserPlaylistsHandler())
			qq.GET("/playlist/tracks", middleware.AllowAnonymous(), handler.QQPlaylistTracksHandler())
			qq.GET("/lyric", middleware.AllowAnonymous(), handler.QQLyricHandler())
			qq.GET("/cover", middleware.AllowAnonymous(), handler.QQCoverHandler())
			qq.GET("/audio", middleware.AllowAnonymous(), handler.QQAudioHandler())
		}
		// cookie 读/写均需内部密钥（对应 Next Server Action 转发）
		cookieWrite := cloudmusic.Group("", middleware.RequireInternalSecret(internalSecret))
		{
			cookieWrite.PUT("/cookie", middleware.AllowAnonymous(), handler.PutCloudCookieHandler())
			cookieWrite.GET("/cookie", middleware.AllowAnonymous(), handler.GetCloudCookieHandler())
			// 扫码轮询成功后会把 cookie 写入后端，故与 cookie 写操作一样需要内部密钥
			cookieWrite.GET("/netease/qr/check", middleware.AllowAnonymous(), handler.NeteaseQRCheckHandler())
		}
	}
}
