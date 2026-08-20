package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListApprovedGuestbookHandler GET /api/guestbook
// 公开接口：仅返回已审核通过的留言
func ListApprovedGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		entries, err := service.ListApprovedGuestbook(c.Request.Context(), store)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取留言列表失败"})
			return
		}
		c.JSON(http.StatusOK, entries)
	}
}

// ListAllGuestbookHandler GET /api/admin/guestbook
// 管理后台：返回全部留言
func ListAllGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		entries, err := service.ListAllGuestbook(c.Request.Context(), store)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取留言列表失败"})
			return
		}
		c.JSON(http.StatusOK, entries)
	}
}

// GetGuestbookHandler GET /api/guestbook/:id
func GetGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		e, err := service.GetGuestbook(c.Request.Context(), store, id)
		if err != nil {
			if errors.Is(err, repository.ErrGuestbookNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "留言不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取留言失败"})
			return
		}
		c.JSON(http.StatusOK, e)
	}
}

// CreateGuestbookHandler POST /api/guestbook
// 访客提交留言（不需要 X-Internal-Secret）
func CreateGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.GuestbookCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		e, err := service.CreateGuestbook(c.Request.Context(), store, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, e)
	}
}

// UpdateGuestbookHandler PUT /api/admin/guestbook/:id
func UpdateGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.GuestbookUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		e, err := service.UpdateGuestbook(c.Request.Context(), store, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrGuestbookNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "留言不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, e)
	}
}

// ApproveGuestbookHandler PATCH /api/admin/guestbook/:id/approve
// 请求体：{"approved": true|false}
func ApproveGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var body struct {
			Approved bool `json:"approved"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		e, err := service.ApproveGuestbook(c.Request.Context(), store, id, body.Approved)
		if err != nil {
			if errors.Is(err, repository.ErrGuestbookNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "留言不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "审核失败"})
			return
		}
		c.JSON(http.StatusOK, e)
	}
}

// ReplyGuestbookHandler POST /api/admin/guestbook/:id/reply
func ReplyGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.GuestbookReplyInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		e, err := service.ReplyGuestbook(c.Request.Context(), store, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrGuestbookNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "留言不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, e)
	}
}

// DeleteGuestbookHandler DELETE /api/admin/guestbook/:id
func DeleteGuestbookHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := strings.TrimSpace(c.Param("id"))
		if err := service.DeleteGuestbook(c.Request.Context(), store, id); err != nil {
			if errors.Is(err, repository.ErrGuestbookNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "留言不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
