package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// MovieSource 电影播放线路
type MovieSource struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// MovieSources jsonb 列类型：movies.sources。
// 强类型替代手写 datatypes.JSON：GORM 通过 Value/Scan 序列化，MarshalJSON 保持内联数组输出。
type MovieSources []MovieSource

// Value 实现 driver.Valuer
func (s MovieSources) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan 实现 sql.Scanner
func (s *MovieSources) Scan(value any) error {
	if value == nil {
		*s = nil
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("movie sources: 无法解析类型 %T", value)
	}
	if len(b) == 0 || string(b) == "null" {
		*s = nil
		return nil
	}
	return json.Unmarshal(b, (*[]MovieSource)(s))
}

// MarshalJSON 保持 jsonb 内容内联（而非嵌套一层对象）
func (s MovieSources) MarshalJSON() ([]byte, error) {
	return json.Marshal([]MovieSource(s))
}

// Movie 电影数据模型（GORM 映射）
type Movie struct {
	ID        string       `gorm:"primaryKey;type:text" json:"id"`
	Title     string       `gorm:"type:text;not null" json:"title"`
	Poster    string       `gorm:"type:text;not null" json:"poster"`
	Year      string       `gorm:"type:text;not null" json:"year"`
	Tags      pq.StringArray `gorm:"type:text[];not null;default:'{}'" json:"tags"`
	Summary   string       `gorm:"type:text;not null;default:''" json:"summary"`
	Sources   MovieSources `gorm:"type:jsonb;not null;default:'[]'" json:"sources"`
	CreatedAt time.Time    `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time    `gorm:"not null;default:now()" json:"updated_at"`
}

// MovieInput 创建电影的入参（id 由调用方传入）
type MovieInput struct {
	ID      string        `json:"id" binding:"required"`
	Title   string        `json:"title" binding:"required"`
	Poster  string        `json:"poster" binding:"required"`
	Year    string        `json:"year" binding:"required"`
	Tags    []string      `json:"tags"`
	Summary string        `json:"summary"`
	Sources []MovieSource `json:"sources"`
}

// MovieUpdate 更新电影的入参（指针字段区分"未提供"和"零值"）
type MovieUpdate struct {
	Title   *string       `json:"title"`
	Poster  *string       `json:"poster"`
	Year    *string       `json:"year"`
	Tags    []string      `json:"tags"`
	Summary *string       `json:"summary"`
	Sources []MovieSource `json:"sources"`
}

// MoviePatch 部分更新电影用的类型化补丁（指针字段，nil 表示不更新）。
// repository.UpdateMovie 直接以该结构调用 GORM Updates，避免字符串列名 + map[string]any。
type MoviePatch struct {
	Title   *string        `json:"title"`
	Poster  *string        `json:"poster"`
	Year    *string        `json:"year"`
	Tags    *pq.StringArray `json:"tags"`
	Summary *string        `json:"summary"`
	Sources *MovieSources  `json:"sources"`
}
