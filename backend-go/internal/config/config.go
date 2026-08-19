package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config 服务配置（纯数据结构，无方法）
type Config struct {
	HTTPPort          string
	DBHost            string
	DBPort            int
	DBUser            string
	DBPassword        string
	DBName            string
	InternalSecret    string
	UploadsDir        string
	// 登录 & JWT
	JWTSecret         string
	AdminCookieName   string
	UserCookieName    string
	SessionTTLSeconds int
	AdminIssuer       string
	UserIssuer        string
	// 会话降级：JWT 验签通过但 PG 表里不存在 session 时是否自动恢复（避免上线瞬间全员重登）
	SessionAutoRecover bool
}

// LoadFromEnv 从环境变量加载配置
func LoadFromEnv() (*Config, error) {
	port, err := strconv.Atoi(getenv("DB_PORT", "5432"))
	if err != nil {
		return nil, fmt.Errorf("invalid DB_PORT: %w", err)
	}
	ttl, err := strconv.Atoi(getenv("SESSION_TTL_SECONDS", "86400"))
	if err != nil {
		return nil, fmt.Errorf("invalid SESSION_TTL_SECONDS: %w", err)
	}
	autoRecover, _ := strconv.ParseBool(getenv("SESSION_AUTO_RECOVER", "true"))
	return &Config{
		HTTPPort:          getenv("HTTP_PORT", "8080"),
		DBHost:            getenv("DB_HOST", "localhost"),
		DBPort:            port,
		DBUser:            getenv("DB_USER", "mahiro"),
		DBPassword:        getenv("DB_PASSWORD", "mahiro"),
		DBName:            getenv("DB_NAME", "mahiro"),
		InternalSecret:    getenv("GO_API_SHARED_SECRET", ""),
		UploadsDir:        getenv("UPLOADS_DIR", "./uploads"),
		JWTSecret:         getenv("JWT_SECRET", ""),
		AdminCookieName:   getenv("ADMIN_COOKIE_NAME", "admin-session"),
		UserCookieName:    getenv("USER_COOKIE_NAME", "user-session"),
		SessionTTLSeconds: ttl,
		AdminIssuer:       getenv("ADMIN_ISSUER", "admin:mahirooyama"),
		UserIssuer:        getenv("USER_ISSUER", "user:mahirooyama"),
		SessionAutoRecover: autoRecover,
	}, nil
}

// DSN 构建 PostgreSQL 连接字符串（纯函数，接收 Config 指针）
func DSN(c *Config) string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Shanghai",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName,
	)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
