package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListTagsHandler GET /api/tags?type=blog|gallery
func ListTagsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tagType := strings.TrimSpace(c.Query("type"))
		tags, err := service.ListTags(c.Request.Context(), db, tagType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取标签列表失败"})
			return
		}
		c.JSON(http.StatusOK, tags)
	}
}

// GetTagHandler GET /api/tags/:type/:id
func GetTagHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tagType := c.Param("type")
		id := c.Param("id")
		t, err := service.GetTag(c.Request.Context(), db, id, tagType)
		if err != nil {
			if errors.Is(err, repository.ErrTagNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取标签失败"})
			return
		}
		c.JSON(http.StatusOK, t)
	}
}

// CreateTagHandler POST /api/admin/tags
func CreateTagHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.TagInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		t, err := service.CreateTag(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, t)
	}
}

// UpdateTagHandler PUT /api/admin/tags/:type/:id
func UpdateTagHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tagType := c.Param("type")
		id := c.Param("id")
		var input model.TagUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		t, err := service.UpdateTag(c.Request.Context(), db, id, tagType, input)
		if err != nil {
			if errors.Is(err, repository.ErrTagNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, t)
	}
}

// DeleteTagHandler DELETE /api/admin/tags/:type/:id
func DeleteTagHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tagType := c.Param("type")
		id := c.Param("id")
		if err := service.DeleteTag(c.Request.Context(), db, id, tagType); err != nil {
			if errors.Is(err, repository.ErrTagNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
