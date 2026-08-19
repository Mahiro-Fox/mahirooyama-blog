// Package fileutil 提供统一的文件上传/保存能力
// upload.go 封装「类型校验 → 命名清理 → 目录确保 → 冲突检查 → 写入」
// 复用方：upload_files_handler(UploadFilesHandler)、blog/gallery/midi 上传、以及统一资源上传接口。
// 纯函数式：只依赖传入参数，不持有全局状态。
package fileutil

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

// 单文件大小上限默认值（10MB），与旧 UploadFilesHandler 保持一致
const DefaultMaxUploadSize int64 = 10 << 20

// SavedFile 单个文件的上传结果（纯数据）
type SavedFile struct {
	RelPath string // 相对 root 的路径（正斜杠），含文件名
	WebPath string // 对外可访问 URL，如 /uploads/images/blog/xxx.webp
	AbsPath string // 磁盘绝对路径
	Width   int    // 图片宽（由调用方传入或非图片为 0）
	Height  int    // 图片高
}

// UploadOptions 上传参数（纯数据）
// Width/Height 不能从 Go 侧可靠解析（webp 需 cgo），由前端 sharp 计算出后传入。
type UploadOptions struct {
	RootDir string   // uploads 根目录（必填）
	RelDir  string   // 相对子目录，"" 表示根目录
	Allowed []string // 类型白名单；为空表示不校验类型
	MaxSize int64    // 单文件字节上限；<=0 时使用 DefaultMaxUploadSize
	Width   int      // 图片宽（可选）
	Height  int      // 图片高（可选）
}

// typeMatch 判断 mime/name 是否命中单条规则
// 规则支持三种：完整 MIME "image/jpeg"、前缀 "image/"、"audio/"、扩展名 ".mid"、".mdx"
func typeMatch(mime, name, rule string) bool {
	rule = strings.TrimSpace(rule)
	if rule == "" {
		return false
	}
	switch {
	case strings.HasPrefix(rule, "."): // 扩展名
		return strings.HasSuffix(strings.ToLower(name), strings.ToLower(rule))
	case strings.HasSuffix(rule, "/"): // MIME 前缀
		return strings.HasPrefix(strings.ToLower(mime), strings.ToLower(rule))
	default: // 完整 MIME
		return strings.EqualFold(mime, rule)
	}
}

// TypeAllowed 校验 mime/name 是否被 allowed 白名单允许
func TypeAllowed(mime, name string, allowed []string) error {
	if len(allowed) == 0 {
		return nil
	}
	for _, r := range allowed {
		if typeMatch(mime, name, r) {
			return nil
		}
	}
	if mime == "" {
		return fmt.Errorf("不支持的文件类型: %s", name)
	}
	return fmt.Errorf("不支持的文件类型: %s", mime)
}

// JoinRel 拼接相对子目录与文件名，统一为正斜杠相对路径
func JoinRel(relDir, fileName string) string {
	if relDir == "" {
		return filepath.ToSlash(fileName)
	}
	return filepath.ToSlash(filepath.Join(relDir, fileName))
}

// SaveByteFile 将 data 写入 rootDir 下 relDir/fileName。做路径安全、冲突检查、目录确保后写入。
// 返回相对路径与对外 URL。纯函数式。
func SaveByteFile(rootDir, relDir, fileName string, data []byte) (string, string, error) {
	if fileName == "" {
		return "", "", fmt.Errorf("文件名不能为空")
	}
	rel := JoinRel(relDir, fileName)
	abs := filepath.Join(rootDir, rel)
	if !IsPathSafe(abs, rootDir) {
		return "", "", fmt.Errorf("非法路径: %s", rel)
	}
	if conflict, _ := CheckFileConflict(abs); conflict != "" {
		return "", "", fmt.Errorf("%s", conflict)
	}
	if err := EnsureDirectory(filepath.Dir(abs)); err != nil {
		return "", "", err
	}
	if err := os.WriteFile(abs, data, 0644); err != nil {
		return "", "", fmt.Errorf("写入文件失败: %w", err)
	}
	return rel, "/uploads/" + rel, nil
}

// SaveUploadedFile 从 multipart 表单读取单个文件并保存（校验大小/类型、命名清理、冲突检查）。
// 原样保存文件内容，不做格式转换。Width/Height 由调用方经 opts 传入。
// 调用方负责：鉴权、限流、错误包装与响应序列化。
func SaveUploadedFile(h *multipart.FileHeader, opts UploadOptions) (SavedFile, error) {
	if h == nil {
		return SavedFile{}, fmt.Errorf("未提供文件")
	}
	if h.Size == 0 {
		return SavedFile{}, fmt.Errorf("文件是空文件")
	}
	maxSize := opts.MaxSize
	if maxSize <= 0 {
		maxSize = DefaultMaxUploadSize
	}
	if h.Size > maxSize {
		return SavedFile{}, fmt.Errorf("文件大小超过限制 (%.2fMB)", float64(h.Size)/(1<<20))
	}

	mime := h.Header.Get("Content-Type")
	if err := TypeAllowed(mime, h.Filename, opts.Allowed); err != nil {
		return SavedFile{}, err
	}

	src, err := h.Open()
	if err != nil {
		return SavedFile{}, fmt.Errorf("打开上传文件失败: %w", err)
	}
	defer src.Close()
	data, err := io.ReadAll(src)
	if err != nil {
		return SavedFile{}, fmt.Errorf("读取上传文件失败: %w", err)
	}

	clean := SanitizeFileName(h.Filename)
	if clean == "" {
		return SavedFile{}, fmt.Errorf("文件名无效")
	}

	// 原样保存
	rel, wp, err := SaveByteFile(opts.RootDir, opts.RelDir, clean, data)
	if err != nil {
		return SavedFile{}, err
	}
	return SavedFile{
		RelPath: rel,
		WebPath: wp,
		AbsPath: filepath.Join(opts.RootDir, rel),
		Width:   opts.Width,
		Height:  opts.Height,
	}, nil
}