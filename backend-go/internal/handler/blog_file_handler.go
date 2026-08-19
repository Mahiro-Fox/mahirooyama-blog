// Package handler
// blog_file_handler.go 实现 /api/blog-files 系列接口
// 对应 Next.js 端 src/app/api/mdx-files/route.ts + src/app/api/mdx-files/[slug]/route.ts
// 以及 src/actions/admin/blog-actions.ts
package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/fileutil"
)

// BlogItem 博客文件项（对应 Next.js AdminBlog）
type BlogItem struct {
	Slug        string   `json:"slug"`
	FileName    string   `json:"fileName"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Thumbnail   string   `json:"thumbnail,omitempty"`
	IsPortrait  bool     `json:"isPortrait"`
	LastUpdated string   `json:"lastUpdated"`
	Tags        []string `json:"tags"`
	Size        int64    `json:"size"`
}

// BlogListResponse 博客列表响应
type BlogListResponse struct {
	Items []BlogItem `json:"items"`
}

// ListBlogFilesHandler GET /api/blog-files
// 列出 blog 目录下所有 .mdx 文件
func ListBlogFilesHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !fileutil.IsPathSafe(blogDir, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if err := fileutil.EnsureDirectory(blogDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		entries, err := os.ReadDir(blogDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取目录失败"})
			return
		}

		var items []BlogItem
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".mdx") {
				continue
			}
			fullPath := filepath.Join(blogDir, entry.Name())
			stats, err := os.Stat(fullPath)
			if err != nil {
				continue
			}
			raw, err := os.ReadFile(fullPath)
			if err != nil {
				continue
			}
			parsed, _ := fileutil.ParseFrontmatter(string(raw))
			slug := strings.TrimSuffix(entry.Name(), ".mdx")

			item := BlogItem{
				Slug:        slug,
				FileName:    entry.Name(),
				Title:       fileutil.GetString(parsed.Data, "title"),
				Description: fileutil.GetString(parsed.Data, "description"),
				Thumbnail:   fileutil.GetString(parsed.Data, "thumbnail"),
				IsPortrait:  fileutil.GetBool(parsed.Data, "isPortrait"),
				LastUpdated: fileutil.GetString(parsed.Data, "lastUpdated"),
				Tags:        fileutil.GetStringSlice(parsed.Data, "tags"),
				Size:        stats.Size(),
			}
			if item.Title == "" {
				item.Title = "无标题"
			}
			items = append(items, item)
		}

		// 按 lastUpdated 倒序排序
		sort.Slice(items, func(i, j int) bool {
			ti, _ := time.Parse(time.RFC3339, items[i].LastUpdated)
			tj, _ := time.Parse(time.RFC3339, items[j].LastUpdated)
			return ti.After(tj)
		})

		if items == nil {
			items = []BlogItem{}
		}

		c.JSON(http.StatusOK, BlogListResponse{Items: items})
	}
}

// GetBlogFileHandler GET /api/blog-files/:slug
// 获取单个 MDX 文件内容
func GetBlogFileHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		filePath := filepath.Join(blogDir, slug+".mdx")
		if !fileutil.IsPathSafe(filePath, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		content, err := os.ReadFile(filePath)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在或读取失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"content": string(content)})
	}
}

// UploadBlogFileHandler POST /api/blog-files
// 接收 multipart/form-data，file 字段为 MDX 文件，slug 可选
// 注：上传已迁移到前端 adminUploadBlogFile，通过统一 /api/uploads/asset 接口落盘，
//     本 handler 已移除。此处保留接口文档占位注释。
// CreateBlogFileHandler POST /api/blog-files (JSON body)
// 通过 JSON body 创建文件，请求体: { "slug": "...", "content": "..." }
func CreateBlogFileHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Slug    string `json:"slug"`
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}

		if input.Slug == "" || input.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必需字段 (slug, content)"})
			return
		}

		cleanSlug := strings.TrimSpace(strings.ToLower(input.Slug))
		if err := fileutil.ValidateSlug(cleanSlug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 验证 frontmatter 中 title 和 thumbnail 字段
		parsed, _ := fileutil.ParseFrontmatter(input.Content)
		if fileutil.GetString(parsed.Data, "title") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "mdx 内容缺少必需的字段 (title, thumbnail)"})
			return
		}

		fileName := cleanSlug + ".mdx"
		filePath := filepath.Join(blogDir, fileName)
		if !fileutil.IsPathSafe(filePath, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if conflict, _ := fileutil.CheckFileConflict(filePath); conflict != "" {
			c.JSON(http.StatusConflict, gin.H{"error": conflict})
			return
		}

		if err := fileutil.EnsureDirectory(blogDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		tmpPath := filePath + ".tmp"
		if err := os.WriteFile(tmpPath, []byte(input.Content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写入文件失败"})
			return
		}
		if err := os.Rename(tmpPath, filePath); err != nil {
			os.Remove(tmpPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名临时文件失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "文件创建成功", "slug": cleanSlug})
	}
}

// UpdateBlogFileHandler PUT /api/blog-files/:slug
// 更新 MDX 文件内容，请求体: { "content": "..." }
func UpdateBlogFileHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		var input struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}

		filePath := filepath.Join(blogDir, slug+".mdx")
		if !fileutil.IsPathSafe(filePath, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if !fileutil.FileExists(filePath) {
			c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
			return
		}

		tmpPath := filePath + ".tmp"
		if err := os.WriteFile(tmpPath, []byte(input.Content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写入文件失败"})
			return
		}
		if err := os.Rename(tmpPath, filePath); err != nil {
			os.Remove(tmpPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名临时文件失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "文件更新成功"})
	}
}

// DeleteBlogFileHandler DELETE /api/blog-files/:slug
// 删除指定的 MDX 文件
func DeleteBlogFileHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		filePath := filepath.Join(blogDir, slug+".mdx")
		if !fileutil.IsPathSafe(filePath, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if err := os.Remove(filePath); err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败，文件可能不存在"})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "文件删除成功"})
	}
}

// RenameBlogFileHandler PATCH /api/blog-files/:slug
// 重命名 MDX 文件，请求体: { "newSlug": "..." }
func RenameBlogFileHandler(blogDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		var input struct {
			NewSlug string `json:"newSlug"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}

		cleanNewSlug := strings.TrimSpace(strings.ToLower(input.NewSlug))
		if err := fileutil.ValidateSlug(cleanNewSlug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		oldPath := filepath.Join(blogDir, slug+".mdx")
		newPath := filepath.Join(blogDir, cleanNewSlug+".mdx")

		if !fileutil.IsPathSafe(oldPath, blogDir) || !fileutil.IsPathSafe(newPath, blogDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if !fileutil.FileExists(oldPath) {
			c.JSON(http.StatusNotFound, gin.H{"error": "原文件不存在"})
			return
		}

		if fileutil.FileExists(newPath) {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("文件 %s.mdx 已存在", cleanNewSlug)})
			return
		}

		if err := os.Rename(oldPath, newPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "文件重命名成功",
			"oldSlug":  slug,
			"newSlug":  cleanNewSlug,
			"fileName": cleanNewSlug + ".mdx",
		})
	}
}
