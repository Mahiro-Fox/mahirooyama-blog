// Package fileutil 提供统一的文件上传/保存能力
// upload.go 封装「类型校验 → 命名清理 → 目录确保 → 冲突检查 → 写入」
// 复用方：blog/gallery/midi 上传、统一资源上传接口 /api/uploads/asset。
// 纯函数式：只依赖传入参数，不持有全局状态。
package fileutil

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// 单文件大小上限默认值（20MB），与旧批量上传逻辑保持一致
const DefaultMaxUploadSize int64 = 20 << 20

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

// dangerousMimeBases 危险 MIME 基准类型：绝对不允许以「图片/任意内容」混过白名单。
// SVG 可内嵌脚本形成 XSS；HTML/XML 可能被浏览器当作页面渲染。
var dangerousMimeBases = []string{
	"text/html",
	"text/xml",
	"application/xml",
	"image/svg+xml",
	"application/x-javascript",
	"text/javascript",
	"application/javascript",
}

// dangerousExts 危险扩展名：即使服务端 MIME 嗅探未被识别（回退 octet-stream/text/plain）也要拦截
var dangerousExts = []string{
	".html", ".htm", ".svg", ".xml", ".xhtml",
	".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
	".sh", ".bash", ".zsh", ".php", ".asp", ".aspx", ".jsp", ".jspx",
	".exe", ".dll", ".so", ".bat", ".cmd", ".ps1", ".com", ".hta", ".jar", ".swf",
}

// mimeBase 取 MIME 字符串去掉 charset 等参数并转小写，如 "text/plain; charset=utf-8" → "text/plain"
func mimeBase(mime string) string {
	return strings.ToLower(strings.TrimSpace(strings.SplitN(mime, ";", 2)[0]))
}

// isDangerousDetected 判断（服务端嗅探出的）MIME 基准类型或文件扩展名是否命中危险名单
func isDangerousDetected(mimeBaseStr, ext string) bool {
	for _, d := range dangerousMimeBases {
		if mimeBaseStr == d {
			return true
		}
	}
	for _, e := range dangerousExts {
		if ext == e {
			return true
		}
	}
	return false
}

// TypeAllowed 校验「服务端嗅探出的 MIME」与文件名是否被 allowed 白名单允许。
// mime 必须是服务端基于文件内容嗅探得到（http.DetectContentType），绝不能是客户端提供的 Content-Type。
// 顺序：先拒绝危险类型，再走扩展名/完整MIME/前缀白名单；未知二进制与纯文本未被显式允许时一律拒绝。
func TypeAllowed(mime, name string, allowed []string) error {
	base := mimeBase(mime)
	ext := strings.ToLower(filepath.Ext(name))
	if isDangerousDetected(base, ext) {
		return fmt.Errorf("不支持的文件类型: %s", name)
	}
	// 无白名单 = 调用方信任当前基座已排除危险类型，放行其余
	if len(allowed) == 0 {
		return nil
	}
	// 1) 扩展名规则（.mdx/.md/.json/.mid 等文本类，命中即放行，不依赖不可靠的 MIME 识别）
	for _, r := range allowed {
		if strings.HasPrefix(r, ".") && strings.EqualFold(r, ext) {
			return nil
		}
	}
	// 2) 完整 MIME / 前缀规则（如 "image/jpeg"、"image/"）
	for _, r := range allowed {
		if strings.HasPrefix(r, ".") {
			continue
		}
		if strings.HasSuffix(r, "/") {
			if strings.HasPrefix(base, mimeBase(r)) {
				return nil
			}
			continue
		}
		if base == mimeBase(r) {
			return nil
		}
	}
	// 3) 其余类型（含服务端嗅探为 application/octet-stream 的未知二进制、text/plain 的普通文本）
	//    未在依据中显式命中一律拒绝，不把不可靠的客户端 Content-Type 当作依据
	return fmt.Errorf("不支持的文件类型: %s", name)
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

	src, err := h.Open()
	if err != nil {
		return SavedFile{}, fmt.Errorf("打开上传文件失败: %w", err)
	}
	defer src.Close()
	data, err := io.ReadAll(src)
	if err != nil {
		return SavedFile{}, fmt.Errorf("读取上传文件失败: %w", err)
	}

	// 服务端嗅探真实 MIME（不信任客户端可伪造的 Content-Type）
	mime := http.DetectContentType(data)
	if err := TypeAllowed(mime, h.Filename, opts.Allowed); err != nil {
		return SavedFile{}, err
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
