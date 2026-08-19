// Package handler 提供 HTTP 处理函数
// upload_file_handler.go 实现 /api/upload-files 系列接口
// 对应 Next.js 端 src/app/api/upload-files/route.ts + src/actions/admin/upload-files-actions.ts
package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"mahirooyama-blog/backend-go/internal/fileutil"
)

// FileItem 文件项（对应 Next.js FileItem 接口）
type FileItem struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Type        string `json:"type"` // "file" | "directory"
	Size        int64  `json:"size"`
	LastUpdated string `json:"lastUpdated"`
	Extension  string `json:"extension,omitempty"`
}

// FileListResponse 列目录响应
type FileListResponse struct {
	Items       []FileItem `json:"items"`
	CurrentPath string     `json:"currentPath"`
	Breadcrumb  []string   `json:"breadcrumb"`
}

// UploadResult 单个文件上传结果
type UploadResult struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	WebpPath  string `json:"webpPath,omitempty"`
	WebpName  string `json:"webpName,omitempty"`
	Success   bool   `json:"success"`
	Converted bool   `json:"converted,omitempty"`
	Error     string `json:"error,omitempty"`
}

// ListUploadFilesHandler GET /api/upload-files?path=
// 列出 uploads 目录下指定相对路径的文件和子目录
func ListUploadFilesHandler(uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		relativePath := strings.TrimSpace(c.Query("path"))
		targetDir := filepath.Join(uploadsDir, relativePath)

		if !fileutil.IsPathSafe(targetDir, uploadsDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		info, err := os.Stat(targetDir)
		if err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "目录不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文件列表失败"})
			return
		}
		if !info.IsDir() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不是目录"})
			return
		}

		entries, err := os.ReadDir(targetDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取目录失败"})
			return
		}

		items := make([]FileItem, 0, len(entries))
		for _, entry := range entries {
			fullPath := filepath.Join(targetDir, entry.Name())
			stats, err := os.Stat(fullPath)
			if err != nil {
				continue
			}
			itemRelPath := filepath.Join(relativePath, entry.Name())
			webPath := "/uploads/" + strings.ReplaceAll(itemRelPath, "\\", "/")
			item := FileItem{
				Name:        entry.Name(),
				Path:        webPath,
				Type:        fileItemType(entry),
				Size:        stats.Size(),
				LastUpdated: stats.ModTime().UTC().Format(time.RFC3339),
			}
			if !entry.IsDir() {
				item.Extension = strings.ToLower(filepath.Ext(entry.Name()))
			}
			items = append(items, item)
		}

		// 排序：文件夹在前，然后按名称排序
		sort.Slice(items, func(i, j int) bool {
			if items[i].Type != items[j].Type {
				return items[i].Type == "directory"
			}
			return items[i].Name < items[j].Name
		})

		// 面包屑
		var breadcrumb []string
		if relativePath != "" {
			breadcrumb = strings.FieldsFunc(relativePath, func(r rune) bool {
				return r == '/' || r == '\\'
			})
		}

		c.JSON(http.StatusOK, FileListResponse{
			Items:       items,
			CurrentPath: relativePath,
			Breadcrumb:  breadcrumb,
		})
	}
}

// UploadFilesHandler POST /api/upload-files?path=
// 接收 multipart/form-data，files 字段支持多文件
// 注意：Go 端暂不做 WebP 转换，原 Next.js 代码已兼容 converted=false
func UploadFilesHandler(uploadsDir string) gin.HandlerFunc {
	const maxFileSize = 10 << 20  // 10MB 单文件
	const maxFilesCount = 20      // 单次最多 20 个
	const maxTotalSize = 100 << 20 // 单次总大小 100MB
	allowedMime := []string{
		"image/jpeg", "image/png", "image/gif", "image/webp",
		"audio/midi", "audio/mid", "audio/x-midi",
		"video/mp4", "application/pdf",
		"text/plain", "application/json",
		"application/octet-stream",
	}

	return func(c *gin.Context) {
		relativePath := strings.TrimSpace(c.Query("path"))
		targetDir := filepath.Join(uploadsDir, relativePath)

		if !fileutil.IsPathSafe(targetDir, uploadsDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "解析表单失败: " + err.Error()})
			return
		}

		form := c.Request.MultipartForm
		if form == nil || len(form.File["files"]) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "没有提供文件"})
			return
		}

		files := form.File["files"]
		if len(files) > maxFilesCount {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("文件数量超过限制，最多允许 %d 个", maxFilesCount)})
			return
		}

		if err := fileutil.EnsureDirectory(targetDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var totalSize int64
		var results []UploadResult
		for _, fh := range files {
			if fh.Size == 0 {
				results = append(results, UploadResult{Name: fh.Filename, Success: false, Error: fmt.Sprintf("文件 %s 是空文件", fh.Filename)})
				continue
			}
			if fh.Size > maxFileSize {
				results = append(results, UploadResult{Name: fh.Filename, Success: false, Error: fmt.Sprintf("文件 %s (%.2fMB) 超过单文件限制 (%dMB)", fh.Filename, float64(fh.Size)/(1<<20), maxFileSize/(1<<20))})
				continue
			}
			totalSize += fh.Size
			if err := fileutil.TypeAllowed(fh.Header.Get("Content-Type"), fh.Filename, allowedMime); err != nil {
				results = append(results, UploadResult{Name: fh.Filename, Success: false, Error: err.Error()})
				continue
			}
		}
		if totalSize > maxTotalSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("总文件大小 (%.2fMB) 超过限制 (%dMB)", float64(totalSize)/(1<<20), maxTotalSize/(1<<20))})
			return
		}

		for _, fh := range files {
			safeName := fileutil.SanitizeFileName(fh.Filename)

			// 跳过前面已验证失败的
			alreadyFailed := false
			for _, r := range results {
				if r.Name == fh.Filename && !r.Success {
					alreadyFailed = true
					break
				}
			}
			if alreadyFailed {
				continue
			}

			saved, err := fileutil.SaveUploadedFile(fh, fileutil.UploadOptions{
				RootDir: uploadsDir,
				RelDir:  relativePath,
				Allowed: allowedMime,
				MaxSize: maxFileSize,
			})
			if err != nil {
				results = append(results, UploadResult{Name: safeName, Success: false, Error: err.Error()})
				continue
			}
			results = append(results, UploadResult{
				Name:      filepath.Base(saved.RelPath),
				Path:      saved.WebPath,
				Success:   true,
				Converted: false,
			})
		}

		success := 0
		for _, r := range results {
			if r.Success {
				success++
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("上传完成: %d 成功, %d 失败", success, len(results)-success),
			"results": results,
		})
	}
}

// CreateFolderHandler POST /api/upload-files/folder
// 请求体: { "relativePath": "...", "folderName": "..." }
func CreateFolderHandler(uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			RelativePath string `json:"relativePath"`
			FolderName   string `json:"folderName"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		folderName := strings.TrimSpace(input.FolderName)
		if folderName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "文件夹名称不能为空"})
			return
		}

		targetDir := filepath.Join(uploadsDir, input.RelativePath)
		if !fileutil.IsPathSafe(targetDir, uploadsDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		newPath := filepath.Join(targetDir, folderName)
		if !fileutil.IsPathSafe(newPath, uploadsDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法文件夹名称"})
			return
		}

		if conflict, _ := fileutil.CheckFileConflict(newPath); conflict != "" {
			c.JSON(http.StatusConflict, gin.H{"error": conflict})
			return
		}

		if err := fileutil.EnsureDirectory(newPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "文件夹创建成功", "folderName": folderName})
	}
}

// DeleteFileHandler DELETE /api/upload-files?path=
// path 可以是文件或目录；目录会递归删除
func DeleteFileHandler(uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		filePath := strings.TrimSpace(c.Query("path"))
		full, err := fileutil.ResolveUploadPath(uploadsDir, filePath)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		info, err := os.Stat(full)
		if err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
			return
		}

		if info.IsDir() {
			if err := os.RemoveAll(full); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "删除目录失败"})
				return
			}
		} else {
			if err := os.Remove(full); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "删除文件失败"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
	}
}

// RenameFileHandler PUT /api/upload-files
// 请求体: { "oldPath": "...", "newName": "..." }
func RenameFileHandler(uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			OldPath string `json:"oldPath"`
			NewName string `json:"newName"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
			return
		}
		newName := strings.TrimSpace(input.NewName)
		if newName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "新名称不能为空"})
			return
		}

		oldFull, err := fileutil.ResolveUploadPath(uploadsDir, input.OldPath)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		dirPath := filepath.Dir(oldFull)
		newFull := filepath.Join(dirPath, newName)
		if !fileutil.IsPathSafe(newFull, uploadsDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}

		if fileutil.FileExists(newFull) {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("名称 %s 已存在", newName)})
			return
		}

		if err := os.Rename(oldFull, newFull); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "重命名成功", "newName": newName})
	}
}

// 文件类型辅助
func fileItemType(entry os.DirEntry) string {
	if entry.IsDir() {
		return "directory"
	}
	return "file"
}

// UploadAssetResult 统一资源上传结果
type UploadAssetResult struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// UploadAssetHandler POST /api/uploads/asset
// 统一的资源（图片/音频等）上传接口，供前端各业务上传 action 复用。
// multipart/form-data：
//   - file  必填：二进制文件（前端可用 sharp 处理后的内容）
//   - dir   可选：相对 uploads 根目录的子目录，如 images/blog；空则存根目录
//   - width 可选：图片宽（前端 sharp 计算后传入）
//   - height 可选：图片高（前端 sharp 计算后传入）
//
// 返回 { url, width, height } 或 { error }。仅保存原样文件，不做格式转换。
func UploadAssetHandler(uploadsDir string) gin.HandlerFunc {
	allowedMime := []string{
		"image/jpeg", "image/png", "image/gif", "image/webp",
		"audio/midi", "audio/mid", "audio/x-midi", "audio/mpeg", "audio/wav",
		"video/mp4", "application/pdf",
		"text/plain", "application/json",
		"application/octet-stream",
		// 扩展名规则：供 blog(mdx)/gallery(json)/midi(mid) 等文本类上传复用
		".mdx", ".md", ".json", ".mid",
	}

	return func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未提供文件"})
			return
		}

		relDir := strings.Trim(strings.TrimSpace(c.PostForm("dir")), "/")
		width, _ := strconv.Atoi(strings.TrimSpace(c.PostForm("width")))
		height, _ := strconv.Atoi(strings.TrimSpace(c.PostForm("height")))

		saved, err := fileutil.SaveUploadedFile(file, fileutil.UploadOptions{
			RootDir: uploadsDir,
			RelDir:  relDir,
			Allowed: allowedMime,
			Width:   width,
			Height:  height,
		})
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "已存在") {
				status = http.StatusConflict
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, UploadAssetResult{
			URL:    saved.WebPath,
			Width:  saved.Width,
			Height: saved.Height,
		})
	}
}
