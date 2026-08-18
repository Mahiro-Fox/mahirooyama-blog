// Package handler
// midi_handler.go 实现 /api/midi 系列接口
// 对应 Next.js 端 src/app/api/midi/route.ts + src/actions/admin/midi-actions.ts
package handler

import (
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

// MidiFileItem MIDI 文件项（对应 Next.js 端 MidiAdminFile + API 响应格式）
type MidiFileItem struct {
	Slug         string `json:"slug"`
	FileName     string `json:"fileName"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified"`
	Path         string `json:"path,omitempty"`
}

// ListMidiFilesHandler GET /api/midi
// 列出 MIDI_DIR 下的所有 .mid 文件，按修改时间倒序
func ListMidiFilesHandler(midiDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := fileutil.EnsureDirectory(midiDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		entries, err := os.ReadDir(midiDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取目录失败"})
			return
		}

		items := make([]MidiFileItem, 0, len(entries))
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			if !strings.HasSuffix(strings.ToLower(entry.Name()), ".mid") {
				continue
			}
			fullPath := filepath.Join(midiDir, entry.Name())
			stats, err := os.Stat(fullPath)
			if err != nil {
				continue
			}
			name := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			items = append(items, MidiFileItem{
				Slug:         name,
				FileName:     entry.Name(),
				Name:         name,
				Size:         stats.Size(),
				LastModified: stats.ModTime().UTC().Format(time.RFC3339),
				Path:         fmt.Sprintf("/uploads/midisongs/%s", entry.Name()),
			})
		}

		// 按修改时间倒序
		sort.Slice(items, func(i, j int) bool {
			return items[i].LastModified > items[j].LastModified
		})

		c.JSON(http.StatusOK, gin.H{"success": true, "files": items})
	}
}

// UploadMidiFileHandler POST /api/midi
// multipart/form-data，file 字段，扩展名必须为 .mid
func UploadMidiFileHandler(midiDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "没有提供文件"})
			return
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".mid" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 .mid 文件"})
			return
		}

		if err := fileutil.EnsureDirectory(midiDir); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		safeName := fileutil.SanitizeFileName(file.Filename)
		if !strings.HasSuffix(strings.ToLower(safeName), ".mid") {
			safeName += ".mid"
		}
		fullPath := filepath.Join(midiDir, safeName)

		if conflict, _ := fileutil.CheckFileConflict(fullPath); conflict != "" {
			c.JSON(http.StatusConflict, gin.H{"error": conflict})
			return
		}

		src, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "打开文件失败"})
			return
		}
		defer src.Close()
		dst, err := os.Create(fullPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建文件失败"})
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, src); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写入文件失败"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"success": true, "fileName": safeName})
	}
}

// DeleteMidiFileHandler DELETE /api/midi/:slug
func DeleteMidiFileHandler(midiDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if slug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "slug 不能为空"})
			return
		}
		fullPath := filepath.Join(midiDir, slug+".mid")
		if !fileutil.IsPathSafe(fullPath, midiDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}
		if err := os.Remove(fullPath); err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除文件失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// RenameMidiFileHandler PUT /api/midi/:slug
// 请求体: { "newName": "..." }
func RenameMidiFileHandler(midiDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		var input struct {
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

		oldPath := filepath.Join(midiDir, slug+".mid")
		if !fileutil.IsPathSafe(oldPath, midiDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法路径"})
			return
		}
		newPath := filepath.Join(midiDir, newName+".mid")
		if !fileutil.IsPathSafe(newPath, midiDir) {
			c.JSON(http.StatusForbidden, gin.H{"error": "非法新名称"})
			return
		}
		if fileutil.FileExists(newPath) {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("名称 %s 已存在", newName)})
			return
		}
		if err := os.Rename(oldPath, newPath); err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "原文件不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "重命名失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "newName": newName})
	}
}
