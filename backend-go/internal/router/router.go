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
}
