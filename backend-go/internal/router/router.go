package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/handler"
	"mahirooyama-blog/backend-go/internal/middleware"
)

// RegisterRoutes 注册所有路由
// 公开端点：GET /api/movies、GET /api/movies/:id
// 受保护端点（写操作）：需 X-Internal-Secret 头
func RegisterRoutes(r *gin.Engine, db *gorm.DB, internalSecret string) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	movies := api.Group("/movies")
	{
		// 公开读端点
		movies.GET("", handler.ListMoviesHandler(db))
		movies.GET("/:id", handler.GetMovieHandler(db))

		// 写操作：需内部密钥
		write := movies.Group("", middleware.RequireInternalSecret(internalSecret))
		write.POST("", handler.CreateMovieHandler(db))
		write.PUT("/:id", handler.UpdateMovieHandler(db))
		write.DELETE("/:id", handler.DeleteMovieHandler(db))
	}
}
