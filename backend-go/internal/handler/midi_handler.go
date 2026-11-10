// Package handler
// midi_handler.go 实现 /api/midi 系列接口
// 对应 Next.js 端 src/app/api/midi/route.ts + src/actions/admin/midi-actions.ts
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

const (
	// midiListDefaultLimit 列表默认每页条数
	midiListDefaultLimit = 20
	// midiListMaxLimit 列表允许的最大每页条数
	midiListMaxLimit = 100
)

// parsePositiveQueryInt 读取正整数查询参数，非法或缺省时返回 fallback
func parsePositiveQueryInt(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

// MidiFileItem MIDI 文件项（对应 Next.js 端 MidiAdminFile + API 响应格式）
type MidiFileItem struct {
	Slug         string `json:"slug"`
	FileName     string `json:"fileName"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified"`
	Path         string `json:"path,omitempty"`
}

// ListMidiFilesHandler GET /api/midi?search=&page=&limit=
// 列出 MIDI_DIR 下的 .mid 文件，按修改时间倒序，支持关键字搜索与分页。
// 搜索匹配文件名（不含扩展名，大小写不敏感）；分页参数非法时回落默认值，
// page 超出范围时收敛到最后一页。
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

		search := strings.ToLower(strings.TrimSpace(c.Query("search")))

		items := make([]MidiFileItem, 0, len(entries))
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			if !strings.HasSuffix(strings.ToLower(entry.Name()), ".mid") {
				continue
			}
			name := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			if search != "" && !strings.Contains(strings.ToLower(name), search) {
				continue
			}
			fullPath := filepath.Join(midiDir, entry.Name())
			stats, err := os.Stat(fullPath)
			if err != nil {
				continue
			}
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

		// 分页
		total := len(items)
		limit := parsePositiveQueryInt(c.Query("limit"), midiListDefaultLimit)
		if limit > midiListMaxLimit {
			limit = midiListMaxLimit
		}
		totalPages := (total + limit - 1) / limit
		page := parsePositiveQueryInt(c.Query("page"), 1)
		if totalPages > 0 && page > totalPages {
			page = totalPages
		}

		start := (page - 1) * limit
		end := min(start+limit, total)
		if start > total {
			start = total
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"files":   items[start:end],
			"pagination": gin.H{
				"page":       page,
				"limit":      limit,
				"total":      total,
				"totalPages": totalPages,
				"hasMore":    page < totalPages,
			},
		})
	}
}

// UploadMidiFileHandler POST /api/midi
// 注：上传已迁移到前端 adminUploadMidiFile，通过统一 /api/uploads/asset 接口落盘，
//     本 handler 已移除。此处保留接口文档占位注释。
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
