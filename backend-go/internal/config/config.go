package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config 服务配置（纯数据结构，无方法）
type Config struct {
	HTTPPort       string
	DBHost         string
	DBPort         int
	DBUser         string
	DBPassword     string
	DBName         string
	InternalSecret string
	UploadsDir     string
}

// LoadFromEnv 从环境变量加载配置
func LoadFromEnv() (*Config, error) {
	port, err := strconv.Atoi(getenv("DB_PORT", "5432"))
	if err != nil {
		return nil, fmt.Errorf("invalid DB_PORT: %w", err)
	}
	return &Config{
		HTTPPort:       getenv("HTTP_PORT", "8080"),
		DBHost:         getenv("DB_HOST", "localhost"),
		DBPort:         port,
		DBUser:         getenv("DB_USER", "mahiro"),
		DBPassword:     getenv("DB_PASSWORD", "mahiro"),
		DBName:         getenv("DB_NAME", "mahiro"),
		InternalSecret: getenv("GO_API_SHARED_SECRET", ""),
		UploadsDir:     getenv("UPLOADS_DIR", "./uploads"),
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
