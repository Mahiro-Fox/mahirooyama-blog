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

// ListMoviesHandler GET /api/movies?search=&tag=
func ListMoviesHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		search := strings.TrimSpace(c.Query("search"))
		tag := strings.TrimSpace(c.Query("tag"))
		movies, err := service.ListMovies(c.Request.Context(), store, search, tag)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取电影列表失败"})
			return
		}
		c.JSON(http.StatusOK, movies)
	}
}

// GetMovieHandler GET /api/movies/:id
func GetMovieHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		m, err := service.GetMovie(c.Request.Context(), store, id)
		if err != nil {
			if errors.Is(err, repository.ErrMovieNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "电影不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取电影失败"})
			return
		}
		c.JSON(http.StatusOK, m)
	}
}

// CreateMovieHandler POST /api/movies
func CreateMovieHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input model.MovieInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		m, err := service.CreateMovie(c.Request.Context(), store, input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, m)
	}
}

// UpdateMovieHandler PUT /api/movies/:id
func UpdateMovieHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input model.MovieUpdate
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "请求参数无效",
				"details": err.Error(),
			})
			return
		}
		m, err := service.UpdateMovie(c.Request.Context(), store, id, input)
		if err != nil {
			if errors.Is(err, repository.ErrMovieNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "电影不存在"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, m)
	}
}

// DeleteMovieHandler DELETE /api/movies/:id
func DeleteMovieHandler(store repository.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := service.DeleteMovie(c.Request.Context(), store, id); err != nil {
			if errors.Is(err, repository.ErrMovieNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "电影不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
