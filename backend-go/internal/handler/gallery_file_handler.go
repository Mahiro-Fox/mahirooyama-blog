// Package handler
// gallery_file_handler.go 实现 /api/gallery-files 系列接口
// 对应 Next.js 端 src/app/api/gallery-files/route.ts + src/app/api/gallery-files/[slug]/route.ts
// 以及 src/actions/admin/gallery-actions.ts
package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/fileutil"
)

// GalleryItem 图库文件项（对应 Next.js AdminGallery）
type GalleryItem struct {
	Slug        string   `json:"slug"`
	FileName    string   `json:"fileName"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Thumbnail   string   `json:"thumbnail"`
	IsPortrait  bool     `json:"isPortrait"`
	LastUpdated string   `json:"lastUpdated"`
	Tags        []string `json:"tags"`
	Size        int64    `json:"size"`
}

// GalleryListResponse 图库列表响应
type GalleryListResponse struct {
	Items []GalleryItem `json:"items"`
}

// ListGalleryFilesHandler GET /api/gallery-files
// 列出 gallery 目录下所有 .json 文件
func ListGalleryFilesHandler(galleryDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := fileutil.EnsureDirectory(galleryDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		entries, err := os.ReadDir(galleryDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取目录失败"})
			return
		}

		var items []GalleryItem
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
				continue
			}
			fullPath := filepath.Join(galleryDir, entry.Name())
			stats, err := os.Stat(fullPath)
			if err != nil {
				continue
			}
			raw, err := os.ReadFile(fullPath)
			if err != nil {
				continue
			}

			var data map[string]interface{}
			if err := json.Unmarshal(raw, &data); err != nil {
				continue
			}

			slug := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			item := GalleryItem{
				Slug:        slug,
				FileName:    entry.Name(),
				Title:       getStringField(data, "title"),
				Description: getStringField(data, "description"),
				Thumbnail:   getStringField(data, "thumbnail"),
				LastUpdated: getStringField(data, "lastUpdated"),
				Size:        stats.Size(),
			}
			if v, ok := data["isPortrait"]; ok {
				if b, ok := v.(bool); ok {
					item.IsPortrait = b
				}
			}
			if tags, ok := data["tags"]; ok {
				if arr, ok := tags.([]interface{}); ok {
					for _, t := range arr {
						if s, ok := t.(string); ok {
							item.Tags = append(item.Tags, s)
						}
					}
				}
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
			items = []GalleryItem{}
		}

		c.JSON(http.StatusOK, GalleryListResponse{Items: items})
	}
}

// GetGalleryFileHandler GET /api/gallery-files/:slug
// 获取单个 JSON 文件内容
func GetGalleryFileHandler(galleryDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		filePath := filepath.Join(galleryDir, slug+".json")
		if !fileutil.IsPathSafe(filePath, galleryDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		content, err := os.ReadFile(filePath)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在或读取失败"})
			return
		}

		var data map[string]interface{}
		if err := json.Unmarshal(content, &data); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JSON 解析失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"content": string(content), "data": data})
	}
}

// UploadGalleryFileHandler POST /api/gallery-files (multipart)
// 接收 multipart/form-data，file 字段为 JSON 文件，slug 可选
func UploadGalleryFileHandler(galleryDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "解析表单失败: " + err.Error()})
			return
		}

		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "没有提供文件"})
			return
		}

		if !strings.HasSuffix(strings.ToLower(file.Filename), ".json") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "只接受 .json 文件"})
			return
		}

		src, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "打开文件失败"})
			return
		}
		content, err := io.ReadAll(src)
		src.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件失败"})
			return
		}

		// 验证 JSON 格式和必需字段
		var parsed map[string]interface{}
		if err := json.Unmarshal(content, &parsed); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 文件格式无效"})
			return
		}
		if getStringField(parsed, "title") == "" || getStringField(parsed, "thumbnail") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 文件缺少必需的字段 (title, thumbnail)"})
			return
		}

		// 确定文件名
		var fileName string
		if slug := c.PostForm("slug"); slug != "" {
			cleanSlug := strings.TrimSpace(strings.ToLower(slug))
			if err := fileutil.ValidateSlug(cleanSlug); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
				return
			}
			fileName = cleanSlug + ".json"
		} else {
			fileName = fileutil.SanitizeFileName(file.Filename)
		}

		filePath := filepath.Join(galleryDir, fileName)
		if !fileutil.IsPathSafe(filePath, galleryDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if conflict, _ := fileutil.CheckFileConflict(filePath); conflict != "" {
			c.JSON(http.StatusConflict, gin.H{"error": conflict})
			return
		}

		if err := fileutil.EnsureDirectory(galleryDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 格式化 JSON 并原子写入
		formatted, err := json.MarshalIndent(parsed, "", "  ")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JSON 格式化失败"})
			return
		}

		tmpPath := filePath + ".tmp"
		if err := os.WriteFile(tmpPath, formatted, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写入文件失败"})
			return
		}
		if err := os.Rename(tmpPath, filePath); err != nil {
			os.Remove(tmpPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名临时文件失败"})
			return
		}

		cleanSlug := strings.TrimSuffix(fileName, ".json")
		c.JSON(http.StatusCreated, gin.H{
			"message":  "文件创建成功",
			"fileName": fileName,
			"slug":     cleanSlug,
		})
	}
}

// CreateGalleryFileHandler POST /api/gallery-files (JSON body)
// 通过 JSON body 创建文件，请求体: { "slug": "...", "content": "..." }
func CreateGalleryFileHandler(galleryDir string) gin.HandlerFunc {
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

		// 验证 JSON 格式
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(input.Content), &parsed); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 格式无效"})
			return
		}
		if getStringField(parsed, "title") == "" || getStringField(parsed, "thumbnail") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 内容缺少必需的字段 (title, thumbnail)"})
			return
		}

		fileName := cleanSlug + ".json"
		filePath := filepath.Join(galleryDir, fileName)
		if !fileutil.IsPathSafe(filePath, galleryDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if conflict, _ := fileutil.CheckFileConflict(filePath); conflict != "" {
			c.JSON(http.StatusConflict, gin.H{"error": conflict})
			return
		}

		if err := fileutil.EnsureDirectory(galleryDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		formatted, err := json.MarshalIndent(parsed, "", "  ")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JSON 格式化失败"})
			return
		}

		tmpPath := filePath + ".tmp"
		if err := os.WriteFile(tmpPath, formatted, 0644); err != nil {
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

// UpdateGalleryFileHandler PUT /api/gallery-files/:slug
// 更新 JSON 文件内容，请求体: { "content": "..." }
func UpdateGalleryFileHandler(galleryDir string) gin.HandlerFunc {
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

		// 验证 JSON
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(input.Content), &parsed); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 格式无效"})
			return
		}
		if getStringField(parsed, "title") == "" || getStringField(parsed, "thumbnail") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 内容缺少必需的字段 (title, thumbnail)"})
			return
		}

		filePath := filepath.Join(galleryDir, slug+".json")
		if !fileutil.IsPathSafe(filePath, galleryDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if !fileutil.FileExists(filePath) {
			c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
			return
		}

		formatted, err := json.MarshalIndent(parsed, "", "  ")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JSON 格式化失败"})
			return
		}

		tmpPath := filePath + ".tmp"
		if err := os.WriteFile(tmpPath, formatted, 0644); err != nil {
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

// DeleteGalleryFileHandler DELETE /api/gallery-files/:slug
// 删除指定的 JSON 文件
func DeleteGalleryFileHandler(galleryDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if err := fileutil.ValidateSlug(slug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件名"})
			return
		}

		filePath := filepath.Join(galleryDir, slug+".json")
		if !fileutil.IsPathSafe(filePath, galleryDir) {
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

// RenameGalleryFileHandler PATCH /api/gallery-files/:slug
// 重命名 JSON 文件，请求体: { "newSlug": "..." }
func RenameGalleryFileHandler(galleryDir string) gin.HandlerFunc {
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
		if cleanNewSlug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "新文件名不能为空"})
			return
		}
		if err := fileutil.ValidateSlug(cleanNewSlug); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		oldPath := filepath.Join(galleryDir, slug+".json")
		newPath := filepath.Join(galleryDir, cleanNewSlug+".json")

		if !fileutil.IsPathSafe(oldPath, galleryDir) || !fileutil.IsPathSafe(newPath, galleryDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if !fileutil.FileExists(oldPath) {
			c.JSON(http.StatusNotFound, gin.H{"error": "原文件不存在"})
			return
		}

		if fileutil.FileExists(newPath) {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("文件 %s.json 已存在", cleanNewSlug)})
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
			"fileName": cleanNewSlug + ".json",
		})
	}
}

// getStringField 从 map 中安全获取字符串字段
func getStringField(data map[string]interface{}, key string) string {
	if v, ok := data[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
