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

// ListBugsHandler GET /api/admin/bugs
func ListBugsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		bugs, err := service.ListBugs(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Bug 列表失败"})
			return
		}
		c.JSON(http.StatusOK, bugs)
	}
}

// GetBugHandler GET /api/admin/bugs/:id
func GetBugHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		b, err := service.GetBug(c.Request.Context(), db, id)
		if err != nil {
			if errors.Is(err, repository.ErrBugNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Bug 报告不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Bug 报告失败"})
			return
		}
		c.JSON(http.StatusOK, b)
	}
}

// CreateBugHandler POST /api/bugs
// 前端用户提交，不需要 X-Internal-Secret
func CreateBugHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.BugCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		input.UserAgent = c.Request.Header.Get("User-Agent")
		b, err := service.CreateBug(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, b)
	}
}

// UpdateBugStatusHandler PATCH /api/admin/bugs/:id/status
func UpdateBugStatusHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.BugUpdateStatusInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		b, err := service.UpdateBugStatus(c.Request.Context(), db, id, input.Status)
		if err != nil {
			if errors.Is(err, repository.ErrBugNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Bug 报告不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, b)
	}
}

// DeleteBugHandler DELETE /api/admin/bugs/:id
func DeleteBugHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteBug(c.Request.Context(), db, id); err != nil {
			if errors.Is(err, repository.ErrBugNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Bug 报告不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
