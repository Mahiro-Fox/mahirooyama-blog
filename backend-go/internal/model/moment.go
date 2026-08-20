// Package model
// moment.go 碎碎念模型（对应 data/moments.json）
package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// MomentImage 碎碎念图片信息
type MomentImage struct {
	URL    string  `json:"url"`
	Width  int     `json:"width"`
	Height int     `json:"height"`
	Ratio  float64 `json:"ratio"`
}

// MomentImageData jsonb 列类型：moments.image。可空（NULL / json null）。
// 通过 Value/Scan 序列化到数据库，MarshalJSON 内联输出，API 形状与 datatypes.JSON 一致。
type MomentImageData struct {
	Image *MomentImage
}

// Value 实现 driver.Valuer（nil 时写出 json null）
func (d MomentImageData) Value() (driver.Value, error) {
	return json.Marshal(d.Image)
}

// Scan 实现 sql.Scanner（NULL 或 "null" 统一视为空）
func (d *MomentImageData) Scan(value any) error {
	if value == nil {
		d.Image = nil
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("moment image: 无法解析类型 %T", value)
	}
	if len(b) == 0 || string(b) == "null" {
		d.Image = nil
		return nil
	}
	var img MomentImage
	if err := json.Unmarshal(b, &img); err != nil {
		return err
	}
	d.Image = &img
	return nil
}

// MarshalJSON 保持 jsonb 内容内联（而非嵌套一层对象）
func (d MomentImageData) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.Image)
}

// Moment 碎碎念模型
type Moment struct {
	ID        string          `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt time.Time       `gorm:"not null;default:now()" json:"createdAt"`
	Content   string          `gorm:"type:text;not null" json:"content"`
	Image     MomentImageData `gorm:"type:jsonb;default:'null'" json:"image"`
	MoodEmoji string          `gorm:"type:text;default:''" json:"moodEmoji"`
	Location  string          `gorm:"type:text;default:''" json:"location"`
}

// MomentInput 创建碎碎念的入参
type MomentInput struct {
	Content   string       `json:"content" binding:"required"`
	Image     *MomentImage `json:"image"`
	MoodEmoji string       `json:"moodEmoji"`
	Location  string       `json:"location"`
}

// MomentUpdate 更新碎碎念的入参
type MomentUpdate struct {
	Content   *string      `json:"content"`
	Image     *MomentImage `json:"image"`
	MoodEmoji *string      `json:"moodEmoji"`
	Location  *string      `json:"location"`
}

// MomentPatch 部分更新碎碎念的类型化补丁（指针字段，nil 表示不更新）。
type MomentPatch struct {
	Content   *string          `json:"content"`
	Image     *MomentImageData `json:"image"`
	MoodEmoji *string          `json:"moodEmoji"`
	Location  *string          `json:"location"`
}
