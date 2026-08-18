package router

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/handler"
	"mahirooyama-blog/backend-go/internal/middleware"
)

// RegisterRoutes 注册所有路由
// 公开端点：GET /api/movies、GET /api/movies/:id、GET /api/midi
// 受保护端点（写操作）：需 X-Internal-Secret 头
func RegisterRoutes(r *gin.Engine, db *gorm.DB, internalSecret, uploadsDir string) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")

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
	// MIDI_DIR = UPLOADS_DIR/midisongs
	midiDir := filepath.Join(uploadsDir, "midisongs")
	midi := api.Group("/midi")
	{
		// GET 公开（前端读取 MIDI 列表）
		midi.GET("", handler.ListMidiFilesHandler(midiDir))
		// 写操作需内部密钥
		midiWrite := midi.Group("", middleware.RequireInternalSecret(internalSecret))
		midiWrite.POST("", handler.UploadMidiFileHandler(midiDir))
		midiWrite.PUT("/:slug", handler.RenameMidiFileHandler(midiDir))
		midiWrite.DELETE("/:slug", handler.DeleteMidiFileHandler(midiDir))
	}

	// upload-files 路由（管理后台文件管理）
	// GET 列目录、POST 上传、PUT 重命名、DELETE 删除、POST /folder 创建文件夹
	uploadFiles := api.Group("/upload-files")
	{
		// 列目录也需要内部密钥（通过 Server Action 转发）
		readWrite := uploadFiles.Group("", middleware.RequireInternalSecret(internalSecret))
		readWrite.GET("", handler.ListUploadFilesHandler(uploadsDir))
		readWrite.POST("", handler.UploadFilesHandler(uploadsDir))
		readWrite.PUT("", handler.RenameFileHandler(uploadsDir))
		readWrite.DELETE("", handler.DeleteFileHandler(uploadsDir))
		readWrite.POST("/folder", handler.CreateFolderHandler(uploadsDir))
	}

	// blog-files 路由（博客 MDX 文件管理）
	// BLOG_DIR = UPLOADS_DIR/content/blog
	blogDir := filepath.Join(uploadsDir, "content", "blog")
	blogFiles := api.Group("/blog-files")
	{
		read := blogFiles.Group("", middleware.RequireInternalSecret(internalSecret))
		read.GET("", handler.ListBlogFilesHandler(blogDir))
		read.GET("/:slug", handler.GetBlogFileHandler(blogDir))
		write := blogFiles.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateBlogFileHandler(blogDir))
		write.POST("/upload", handler.UploadBlogFileHandler(blogDir))
		write.PUT("/:slug", handler.UpdateBlogFileHandler(blogDir))
		write.PATCH("/:slug", handler.RenameBlogFileHandler(blogDir))
		write.DELETE("/:slug", handler.DeleteBlogFileHandler(blogDir))
	}

	// gallery-files 路由（图库 JSON 文件管理）
	// GALLERY_DIR = UPLOADS_DIR/content/gallery
	galleryDir := filepath.Join(uploadsDir, "content", "gallery")
	galleryFiles := api.Group("/gallery-files")
	{
		read := galleryFiles.Group("", middleware.RequireInternalSecret(internalSecret))
		read.GET("", handler.ListGalleryFilesHandler(galleryDir))
		read.GET("/:slug", handler.GetGalleryFileHandler(galleryDir))
		write := galleryFiles.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateGalleryFileHandler(galleryDir))
		write.POST("/upload", handler.UploadGalleryFileHandler(galleryDir))
		write.PUT("/:slug", handler.UpdateGalleryFileHandler(galleryDir))
		write.PATCH("/:slug", handler.RenameGalleryFileHandler(galleryDir))
		write.DELETE("/:slug", handler.DeleteGalleryFileHandler(galleryDir))
	}

	// music 路由（音乐管理）
	music := api.Group("/music")
	{
		music.GET("", handler.ListSongsHandler(db))
		music.GET("/:id", handler.GetSongHandler(db))
		write := music.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateSongHandler(db))
		write.PUT("/:id", handler.UpdateSongHandler(db))
		write.DELETE("/:id", handler.DeleteSongHandler(db))
	}

	// moments 路由（碎碎念）
	moments := api.Group("/moments")
	{
		moments.GET("", handler.ListMomentsHandler(db))
		moments.GET("/:id", handler.GetMomentHandler(db))
		write := moments.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMomentHandler(db))
		write.PUT("/:id", handler.UpdateMomentHandler(db))
		write.DELETE("/:id", handler.DeleteMomentHandler(db))
	}

	// guestbook 路由（留言板）
	// 访客提交和查看已审核留言公开；管理操作需内部密钥
	guestbook := api.Group("/guestbook")
	{
		guestbook.GET("", handler.ListApprovedGuestbookHandler(db))
		guestbook.GET("/:id", handler.GetGuestbookHandler(db))
		// 访客提交留言（不需要内部密钥）
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

	// bugs 路由（Bug 报告）
	// 前端用户提交公开；管理操作需内部密钥
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

	// accounts 路由（前台账户）
	// 注册、登录公开；管理操作需内部密钥
	accounts := api.Group("/accounts")
	{
		accounts.POST("", handler.CreateAccountHandler(db))
		accounts.POST("/login", handler.LoginAccountHandler(db))
	}
	accountsAdmin := api.Group("/admin/accounts", middleware.RequireInternalSecret(internalSecret))
	{
		accountsAdmin.GET("", handler.ListAccountsHandler(db))
		accountsAdmin.GET("/:id", handler.GetAccountHandler(db))
		accountsAdmin.PUT("/:id/password", handler.UpdateAccountPasswordHandler(db))
		accountsAdmin.DELETE("/:id", handler.DeleteAccountHandler(db))
	}

	// admin-users 路由（后台管理员用户）
	// 登录公开；其他操作需内部密钥
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

	// role-permissions 路由（角色权限管理）
	rolePerms := api.Group("/admin/role-permissions", middleware.RequireInternalSecret(internalSecret))
	{
		rolePerms.GET("", handler.ListRolePermissionsHandler(db))
		rolePerms.GET("/:role", handler.GetRolePermissionsHandler(db))
		rolePerms.PUT("", handler.UpdateRolePermissionsHandler(db))
		rolePerms.DELETE("/:role", handler.DeleteRolePermissionsHandler(db))
	}

	// tags 路由（标签管理）
	// 公开查询：按 type 过滤；管理操作需内部密钥
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
