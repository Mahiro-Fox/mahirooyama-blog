package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/model"
	"mahirooyama-blog/backend-go/internal/repository"
	"mahirooyama-blog/backend-go/internal/service"
)

// ListAccountsHandler GET /api/admin/accounts
func ListAccountsHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		accounts, err := service.ListAccounts(c.Request.Context(), store)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取账户列表失败"})
			return
		}
		c.JSON(http.StatusOK, accounts)
	}
}

// GetAccountHandler GET /api/admin/accounts/:id（管理员端，返回完整字段）
func GetAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		a, err := service.GetAccount(c.Request.Context(), store, id)
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

// GetPublicAccountHandler GET /api/accounts/:id（公开只读端点）
// 只返回 PublicAccountDTO：id / username / email / provider / createdAt
func GetPublicAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" || len(id) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的账户 ID"})
			return
		}
		a, err := service.GetAccount(c.Request.Context(), store, id)
		if err != nil {
			if errors.Is(err, repository.ErrAccountNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取账户失败"})
			return
		}
		c.JSON(http.StatusOK, model.PublicAccountDTO{
			ID:        a.ID,
			Username:  a.Username,
			Email:     a.Email,
			Provider:  a.Provider,
			CreatedAt: a.CreatedAt,
		})
	}
}

// CreateAccountHandler POST /api/accounts
// 前台注册接口（不需要 X-Internal-Secret）
func CreateAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AccountCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.CreateAccount(c.Request.Context(), store, input)
		if err != nil {
			if errors.Is(err, repository.ErrAccountUsernameTaken) {
				c.JSON(http.StatusConflict, gin.H{"error": "用户名已被占用"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// 注册接口对外仍返回不含密码哈希的精简 DTO
		c.JSON(http.StatusCreated, model.PublicAccountDTO{
			ID:        a.ID,
			Username:  a.Username,
			Email:     a.Email,
			Provider:  a.Provider,
			CreatedAt: a.CreatedAt,
		})
	}
}

// LoginAccountHandler POST /api/accounts/login
// 前台登录（不需要 X-Internal-Secret）。保留用于向后兼容；新端点 login-with-session 由 UserAuthHandler 提供。
func LoginAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AccountLoginInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.VerifyAccount(c.Request.Context(), store, input)
		if err != nil {
			if errors.Is(err, service.ErrInvalidCredentials) {
				// 凭据错误：统一 401 固定文案，不透出内部细节
				c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
				return
			}
			// 其余视为服务端内部错误：只进日志，对外返回通用文案
			log.Printf("account login internal error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "登录失败，请稍后重试"})
			return
		}
		c.JSON(http.StatusOK, model.PublicAccountDTO{
			ID:        a.ID,
			Username:  a.Username,
			Email:     a.Email,
			Provider:  a.Provider,
			CreatedAt: a.CreatedAt,
		})
	}
}

// CreateAccountAdminHandler POST /api/admin/accounts
// 管理端创建前台账户（需要 X-Internal-Secret）。返回完整 Account（密码哈希通过 json:"-" 屏蔽）
func CreateAccountAdminHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.AccountCreateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.CreateAccount(c.Request.Context(), store, input)
		if err != nil {
			if errors.Is(err, repository.ErrAccountUsernameTaken) {
				c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, a)
	}
}

// UpdateAccountHandler PUT /api/admin/accounts/:id
// 更新前台账户基本信息（用户名 / email）。OAuth 账户改 username 会被拒绝。
func UpdateAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.AccountUpdateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		a, err := service.UpdateAccount(c.Request.Context(), store, id, input)
		if err != nil {
			switch {
			case errors.Is(err, repository.ErrAccountNotFound):
				c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
			case errors.Is(err, repository.ErrAccountUsernameTaken):
				c.JSON(http.StatusConflict, gin.H{"error": "用户名已被占用"})
			case errors.Is(err, repository.ErrAccountEmailTaken):
				c.JSON(http.StatusConflict, gin.H{"error": "邮箱已被占用"})
			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, a)
	}
}

// UpdateAccountPasswordHandler PUT /api/admin/accounts/:id/password
func UpdateAccountPasswordHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var body struct {
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		if err := service.UpdateAccountPassword(c.Request.Context(), store, id, body.Password); err != nil {
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
func DeleteAccountHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteAccount(c.Request.Context(), store, id); err != nil {
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
