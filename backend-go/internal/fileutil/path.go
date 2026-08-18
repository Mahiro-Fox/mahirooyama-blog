// Package fileutil 提供文件路径安全检查和目录操作工具
// 对应 Next.js 端 src/utils/file-utils.ts 的功能
package fileutil

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// IsPathSafe 验证文件路径是否在允许的目录范围内（防止目录遍历攻击）
// 对应 src/utils/file-utils.ts 的 isPathSafe
func IsPathSafe(targetPath, allowedBase string) bool {
	resolvedTarget, err := filepath.Abs(filepath.Clean(targetPath))
	if err != nil {
		return false
	}
	resolvedBase, err := filepath.Abs(filepath.Clean(allowedBase))
	if err != nil {
		return false
	}
	// 确保目标路径在基础目录下（或就是基础目录本身）
	// filepath.Rel(base, target) 返回 "." 表示两者相同，属于合法情况
	rel, err := filepath.Rel(resolvedBase, resolvedTarget)
	if err != nil {
		return false
	}
	return !strings.HasPrefix(rel, "..")
}

// EnsureDirectory 确保目录存在，不存在则递归创建
// 对应 src/utils/file-utils.ts 的 ensureDirectory
func EnsureDirectory(dirPath string) error {
	if err := os.MkdirAll(dirPath, 0755); err != nil && !os.IsExist(err) {
		return fmt.Errorf("创建目录失败: %w", err)
	}
	return nil
}

// FileExists 检查文件是否存在
func FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return err == nil
}

// CheckFileConflict 检查文件是否已存在
// 返回错误信息和非空 status；不存在则返回空字符串
func CheckFileConflict(filePath string) (string, int) {
	if FileExists(filePath) {
		name := filepath.Base(filePath)
		return fmt.Sprintf("文件 %s 已存在", name), 409
	}
	return "", 0
}

// SanitizeFileName 清理文件名，保留中文、字母、数字、点、连字符
// 对应 Next.js 端 file.name.replace(/[^\w\u4e00-\u9fa5.-]/g, '-')
func SanitizeFileName(name string) string {
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= 0x4e00 && r <= 0x9fa5: // CJK 统一汉字
			b.WriteRune(r)
		case r == '.' || r == '-':
			b.WriteRune(r)
		default:
			b.WriteRune('-')
		}
	}
	return b.String()
}

// ResolveUploadPath 解析相对 uploads 的完整路径，并做安全校验
// relativePath 是相对 uploads 目录的路径（可能带前导 / 或 uploads/ 前缀）
// 返回完整路径；如果路径不安全返回空字符串和错误
// ValidateSlug 验证 slug 是否合法
// 对应 src/utils/file-utils.ts 的 validateSlug
func ValidateSlug(slug string) error {
	if slug == "" {
		return fmt.Errorf("slug 不能为空")
	}
	if len(slug) > 100 {
		return fmt.Errorf("slug 长度不能超过 100")
	}
	if slug != strings.ToLower(slug) {
		return fmt.Errorf("slug 只能包含小写字母")
	}
	matched, _ := regexp.MatchString(`^[a-z0-9-]+$`, slug)
	if !matched {
		return fmt.Errorf("slug 只能包含小写字母、数字和连接符(-)")
	}
	if strings.HasPrefix(slug, "-") || strings.HasSuffix(slug, "-") {
		return fmt.Errorf("slug 不能以分隔符开头或结尾")
	}
	if strings.Contains(slug, "--") {
		return fmt.Errorf("slug 不能包含连续的 --")
	}
	return nil
}

// ResolveUploadPath 解析相对 uploads 的完整路径，并做安全校验
// relativePath 是相对 uploads 目录的路径（可能带前导 / 或 uploads/ 前缀）
// 返回完整路径；如果路径不安全返回空字符串和错误
func ResolveUploadPath(uploadsDir, relativePath string) (string, error) {
	cleaned := strings.TrimPrefix(relativePath, "/uploads/")
	cleaned = strings.TrimPrefix(cleaned, "uploads/")
	cleaned = strings.TrimPrefix(cleaned, "/")

	full := filepath.Join(uploadsDir, cleaned)
	if !IsPathSafe(full, uploadsDir) {
		return "", fmt.Errorf("非法路径")
	}
	return full, nil
}
