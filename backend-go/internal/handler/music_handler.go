package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListSongsHandler GET /api/music
func ListSongsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		songs, err := service.ListSongs(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取音乐列表失败"})
			return
		}
		c.JSON(http.StatusOK, songs)
	}
}

// GetSongHandler GET /api/music/:id
func GetSongHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		s, err := service.GetSong(c.Request.Context(), db, id)
		if err != nil {
			if errors.Is(err, repository.ErrSongNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "音乐不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取音乐失败"})
			return
		}
		c.JSON(http.StatusOK, s)
	}
}

// CreateSongHandler POST /api/music
func CreateSongHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.SongInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		s, err := service.CreateSong(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, s)
	}
}

// UpdateSongHandler PUT /api/music/:id
func UpdateSongHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.SongUpdate
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		s, err := service.UpdateSong(c.Request.Context(), db, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrSongNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "音乐不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, s)
	}
}

// DeleteSongHandler DELETE /api/music/:id
func DeleteSongHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteSong(c.Request.Context(), db, id); err != nil {
			if errors.Is(err, repository.ErrSongNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "音乐不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
