package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// AnalyticsJSONObj 埋点中 location / device / properties 三列 jsonb 的通用类型。
// 统一实现 Value/Scan/MarshalJSON，GORM 按 JSONB 存取，API 输出保持 map 结构。
type AnalyticsJSONObj map[string]any

// Value 实现 driver.Valuer
func (o AnalyticsJSONObj) Value() (driver.Value, error) {
	if o == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(o)
}

// Scan 实现 sql.Scanner
func (o *AnalyticsJSONObj) Scan(value any) error {
	if value == nil {
		*o = AnalyticsJSONObj{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("analytics json: 无法解析类型 %T", value)
	}
	if len(b) == 0 || string(b) == "null" {
		*o = AnalyticsJSONObj{}
		return nil
	}
	m := map[string]any{}
	if err := json.Unmarshal(b, &m); err != nil {
		return err
	}
	*o = AnalyticsJSONObj(m)
	return nil
}

// MarshalJSON 输出 map 结构（空则输出 {}）
func (o AnalyticsJSONObj) MarshalJSON() ([]byte, error) {
	if o == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(map[string]any(o))
}

// AnalyticsLog 埋点日志（GORM → analytics_logs 表）
type AnalyticsLog struct {
	ID         string           `gorm:"primaryKey;type:text" json:"id"`
	Timestamp  time.Time        `gorm:"not null;index:idx_analytics_timestamp" json:"timestamp"`
	Event      string           `gorm:"type:text;not null;index:idx_analytics_event" json:"event"`
	URL        string           `gorm:"type:text;not null" json:"url"`
	Referrer   string           `gorm:"type:text;not null;default:''" json:"referrer"`
	Screen     string           `gorm:"type:text;not null;default:''" json:"screen"`
	Properties AnalyticsJSONObj `gorm:"type:jsonb;not null;default:'{}'" json:"properties"`
	Location   AnalyticsJSONObj `gorm:"type:jsonb;not null;default:'{}'" json:"location"`
	Device     AnalyticsJSONObj `gorm:"type:jsonb;not null;default:'{}'" json:"device"`
	IPMasked   string           `gorm:"type:text;not null;default:'unknown'" json:"ip_masked"`
}

// AnalyticsLocation 地理解析结果（组装 Location 用）
type AnalyticsLocation struct {
	Country string `json:"country"`
	Region  string `json:"region"`
	City    string `json:"city"`
}

// AnalyticsDevice 设备解析结果（组装 Device 用）
type AnalyticsDevice struct {
	Browser  string `json:"browser"`
	OS       string `json:"os"`
	IsMobile bool   `json:"isMobile"`
}