package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
)

// maxConversationBody 会话消息体上限（1MB，防御超大 payload）
const maxConversationBody = 1 << 20

// upsertConversationBody PUT /api/conversations/:id 请求体
type upsertConversationBody struct {
	UserID   string          `json:"userId"`
	Title    string          `json:"title"`
	Messages json.RawMessage `json:"messages"`
}

// updateConversationTitleBody PATCH /api/conversations/:id 请求体
type updateConversationTitleBody struct {
	UserID string `json:"userId"`
	Title  string `json:"title"`
}

// userIdFromQuery 从 query 提取非空 userId
func userIdFromQuery(c *gin.Context) string {
	return strings.TrimSpace(c.Query("userId"))
}

// UpsertConversationHandler PUT /api/conversations/:id
// 写入/更新一条会话（存在则更新 title/messages/updated_at，保留 user_id/created_at）。
func UpsertConversationHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := strings.TrimSpace(c.Param("id"))

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxConversationBody)

		var body upsertConversationBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		if body.UserID == "" || id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 userId 或 conversationId"})
			return
		}

		now := time.Now()
		conv := &model.Conversation{
			ID:        id,
			UserID:    body.UserID,
			Title:     strings.TrimSpace(body.Title),
			CreatedAt: now,
			UpdatedAt: now,
			Messages:  model.MessagesJSON(body.Messages),
		}
		if err := store.UpsertConversation(c.Request.Context(), conv); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存会话失败"})
			return
		}
		c.JSON(http.StatusOK, conv)
	}
}

// ListConversationsHandler GET /api/conversations?userId=
func ListConversationsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := userIdFromQuery(c)
		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 userId"})
			return
		}
		items, err := store.ListConversationSummariesByUser(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话列表失败"})
			return
		}
		c.JSON(http.StatusOK, items)
	}
}

// GetConversationHandler GET /api/conversations/:id?userId=
func GetConversationHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := userIdFromQuery(c)
		id := c.Param("id")
		conv, err := store.GetConversationByID(c.Request.Context(), userID, id)
		if err != nil {
			if errors.Is(err, repository.ErrConversationNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "会话不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话失败"})
			return
		}
		c.JSON(http.StatusOK, conv)
	}
}

// UpdateConversationTitleHandler PATCH /api/conversations/:id
func UpdateConversationTitleHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := strings.TrimSpace(c.Param("id"))

		var body updateConversationTitleBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		if body.UserID == "" || id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 userId 或 conversationId"})
			return
		}
		if body.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "标题不能为空"})
			return
		}

		if err := store.UpdateConversationTitle(c.Request.Context(), body.UserID, id, body.Title); err != nil {
			if errors.Is(err, repository.ErrConversationNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "会话不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新标题失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// DeleteConversationHandler DELETE /api/conversations/:id?userId=
func DeleteConversationHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := userIdFromQuery(c)
		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 userId"})
			return
		}
		if _, err := store.DeleteConversation(c.Request.Context(), userID, c.Param("id")); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除会话失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}