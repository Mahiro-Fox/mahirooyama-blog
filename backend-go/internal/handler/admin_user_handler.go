package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListAdminUsersHandler GET /api/admin/users
func ListAdminUsersHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		users, err := service.ListAdminUsers(c.Request.Context(), store)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户列表失败"})
			return
		}
		c.JSON(http.StatusOK, users)
	}
}

// GetAdminUserHandler GET /api/admin/users/:id
func GetAdminUserHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		u, err := service.GetAdminUser(c.Request.Context(), store, id)
		if err != nil {
			if errors.Is(err, repository.ErrAdminUserNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户失败"})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

// CreateAdminUserHandler POST /api/admin/users
func CreateAdminUserHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AdminUserCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		u, err := service.CreateAdminUser(c.Request.Context(), store, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, u)
	}
}

// LoginAdminUserHandler POST /api/admin/users/login
func LoginAdminUserHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body struct {
			Username string `json:"username" binding:"required"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		u, err := service.VerifyAdminUser(c.Request.Context(), store, body.Username, body.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

// UpdateAdminUserHandler PUT /api/admin/users/:id
func UpdateAdminUserHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.AdminUserUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		u, err := service.UpdateAdminUser(c.Request.Context(), store, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrAdminUserNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

// UpdateAdminUserPasswordHandler PUT /api/admin/users/:id/password
func UpdateAdminUserPasswordHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.AdminUserPasswordUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		if err := service.UpdateAdminUserPassword(c.Request.Context(), store, id, input.Password); err != nil {
			if errors.Is(err, repository.ErrAdminUserNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// DeleteAdminUserHandler DELETE /api/admin/users/:id
func DeleteAdminUserHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteAdminUser(c.Request.Context(), store, id); err != nil {
			if errors.Is(err, repository.ErrAdminUserNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
