// Package auth
// session_util.go：会话工具（纯函数，目前只有 UUID v4 sessionId 生成；
// ipMask 预留用于后续 analytics 埋点 IPv4 末段脱敏，本轮不消费）
package auth

import (
	"fmt"
	"net/netip"
	"strings"

	"github.com/google/uuid"
)

// NewSessionID 生成新的会话 UUID（单设备登录时用来判定「其他设备」）
func NewSessionID() string {
	return uuid.NewString()
}

// MaskIP 掩码 IP：
// - IPv4 末段替换为 "*"（与原 Next 端 maskIpAddress 保持一致）
// - IPv4 映射的 IPv6 先净掉前缀再处理
// - IPv6/解析失败直接返回原值 + "*" 后缀兜底（避免泄漏完整地址）
func MaskIP(raw string) string {
	if strings.TrimSpace(raw) == "" {
		return "unknown"
	}
	clean := strings.TrimPrefix(strings.TrimSpace(raw), "::ffff:")

	if addr, err := netip.ParseAddr(clean); err == nil && addr.Is4() {
		octs := addr.As4()
		return fmt.Sprintf("%d.%d.%d.*", octs[0], octs[1], octs[2])
	}

	// 兼容「非规范 IPv4：字符串本身点分四段」的情况（netip.ParseAddr 能处理基本会覆盖）
	parts := strings.Split(clean, ".")
	if len(parts) == 4 {
		return parts[0] + "." + parts[1] + "." + parts[2] + ".*"
	}
	return clean + "*"
}
