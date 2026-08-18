// Package fileutil
// frontmatter.go 实现 MDX 文件的 YAML frontmatter 解析
// 对应 Next.js 端 gray-matter 库的功能
package fileutil

import (
	"strings"

	"github.com/goccy/go-yaml"
)

// Frontmatter 解析 MDX 文件的 frontmatter 和正文
type ParsedMDX struct {
	Data    map[string]interface{} `json:"data"`
	Content string                `json:"content"`
}

// ParseFrontmatter 解析包含 YAML frontmatter 的 MDX 内容
// 格式：---\n{yaml}\n---\n{content}
func ParseFrontmatter(raw string) (*ParsedMDX, error) {
	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, "---") {
		return &ParsedMDX{Data: map[string]interface{}{}, Content: raw}, nil
	}

	// 找到开头的 --- 结束
	rest := trimmed[3:]
	endIdx := strings.Index(rest, "\n---")
	if endIdx == -1 {
		return &ParsedMDX{Data: map[string]interface{}{}, Content: raw}, nil
	}

	yamlBlock := rest[:endIdx]
	content := strings.TrimSpace(rest[endIdx+4:])

	var data map[string]interface{}
	if err := yaml.Unmarshal([]byte(yamlBlock), &data); err != nil {
		return &ParsedMDX{Data: map[string]interface{}{}, Content: raw}, nil
	}

	return &ParsedMDX{Data: data, Content: content}, nil
}

// GetString 从 frontmatter data 中安全获取字符串字段
func GetString(data map[string]interface{}, key string) string {
	if v, ok := data[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// GetBool 从 frontmatter data 中安全获取布尔字段
func GetBool(data map[string]interface{}, key string) bool {
	if v, ok := data[key]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return false
}

// GetStringSlice 从 frontmatter data 中安全获取字符串数组字段
func GetStringSlice(data map[string]interface{}, key string) []string {
	if v, ok := data[key]; ok {
		if arr, ok := v.([]interface{}); ok {
			result := make([]string, 0, len(arr))
			for _, item := range arr {
				if s, ok := item.(string); ok {
					result = append(result, s)
				}
			}
			return result
		}
	}
	return []string{}
}
