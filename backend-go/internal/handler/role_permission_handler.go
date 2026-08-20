package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListRolePermissionsHandler GET /api/admin/role-permissions
func ListRolePermissionsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		rps, err := service.ListRolePermissions(c.Request.Context(), store)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取角色权限失败"})
			return
		}
		c.JSON(http.StatusOK, rps)
	}
}

// GetRolePermissionsHandler GET /api/admin/role-permissions/:role
func GetRolePermissionsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.Param("role")
		rp, err := service.GetRolePermissions(c.Request.Context(), store, role)
		if err != nil {
			if errors.Is(err, repository.ErrRoleNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "角色不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取角色权限失败"})
			return
		}
		c.JSON(http.StatusOK, rp)
	}
}

// UpdateRolePermissionsHandler PUT /api/admin/role-permissions
func UpdateRolePermissionsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.RolePermissionUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		rp, err := service.UpdateRolePermissions(c.Request.Context(), store, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, rp)
	}
}

// DeleteRolePermissionsHandler DELETE /api/admin/role-permissions/:role
func DeleteRolePermissionsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.Param("role")
		if err := service.DeleteRolePermissions(c.Request.Context(), store, role); err != nil {
			if errors.Is(err, repository.ErrRoleNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "角色不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
