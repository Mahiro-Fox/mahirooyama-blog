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

// ListAccountsHandler GET /api/admin/accounts
func ListAccountsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		accounts, err := service.ListAccounts(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取账户列表失败"})
			return
		}
		c.JSON(http.StatusOK, accounts)
	}
}

// GetAccountHandler GET /api/admin/accounts/:id
func GetAccountHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		a, err := service.GetAccount(c.Request.Context(), db, id)
		if err != nil {
			if errors.Is(err, repository.ErrAccountNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取账户失败"})
			return
		}
		c.JSON(http.StatusOK, a)
	}
}

// CreateAccountHandler POST /api/accounts
// 前台注册接口（不需要 X-Internal-Secret）
func CreateAccountHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AccountCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.CreateAccount(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, a)
	}
}

// LoginAccountHandler POST /api/accounts/login
// 前台登录（不需要 X-Internal-Secret）
func LoginAccountHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AccountLoginInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.VerifyAccount(c.Request.Context(), db, input)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, a)
	}
}

// UpdateAccountPasswordHandler PUT /api/admin/accounts/:id/password
func UpdateAccountPasswordHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var body struct {
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		if err := service.UpdateAccountPassword(c.Request.Context(), db, id, body.Password); err != nil {
			if errors.Is(err, repository.ErrAccountNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// DeleteAccountHandler DELETE /api/admin/accounts/:id
func DeleteAccountHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteAccount(c.Request.Context(), db, id); err != nil {
			if errors.Is(err, repository.ErrAccountNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
