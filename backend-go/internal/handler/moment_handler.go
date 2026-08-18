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

// ListMomentsHandler GET /api/moments
func ListMomentsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		moments, err := service.ListMoments(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取碎碎念列表失败"})
			return
		}
		c.JSON(http.StatusOK, moments)
	}
}

// GetMomentHandler GET /api/moments/:id
func GetMomentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		m, err := service.GetMoment(c.Request.Context(), db, id)
		if err != nil {
			if errors.Is(err, repository.ErrMomentNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "碎碎念不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取碎碎念失败"})
			return
		}
		c.JSON(http.StatusOK, m)
	}
}

// CreateMomentHandler POST /api/moments
func CreateMomentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.MomentInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		m, err := service.CreateMoment(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, m)
	}
}

// UpdateMomentHandler PUT /api/moments/:id
func UpdateMomentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.MomentUpdate
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		m, err := service.UpdateMoment(c.Request.Context(), db, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrMomentNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "碎碎念不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, m)
	}
}

// DeleteMomentHandler DELETE /api/moments/:id
func DeleteMomentHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteMoment(c.Request.Context(), db, id); err != nil {
			if errors.Is(err, repository.ErrMomentNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "碎碎念不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
