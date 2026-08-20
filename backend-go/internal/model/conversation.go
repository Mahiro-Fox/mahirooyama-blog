package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// MessagesJSON 原样保存 conversations.messages（jsonb 数组），不解析内部结构。
// 前端 AI 对话的消息含 role/parts 等任意结构，这里只做字节级存取，保证往返一致。
type MessagesJSON json.RawMessage

// Value 实现 driver.Valuer（空值输出 []）
func (m MessagesJSON) Value() (driver.Value, error) {
	if m == nil {
		return []byte("[]"), nil
	}
	return []byte(m), nil
}

// Scan 实现 sql.Scanner
func (m *MessagesJSON) Scan(value any) error {
	switch v := value.(type) {
	case nil:
		*m = MessagesJSON("[]")
	case []byte:
		*m = append((*m)[:0], v...)
	case string:
		*m = MessagesJSON(v)
	default:
		return fmt.Errorf("conversation messages: 无法解析类型 %T", value)
	}
	return nil
}

// MarshalJSON 原样透传消息数组
func (m MessagesJSON) MarshalJSON() ([]byte, error) {
	if m == nil {
		return []byte("[]"), nil
	}
	return m, nil
}

// UnmarshalJSON 原样保留消息数组
func (m *MessagesJSON) UnmarshalJSON(b []byte) error {
	*m = append((*m)[:0], b...)
	return nil
}

// Conversation AI 对话（GORM → conversations 表）
// 存储只负责落盘与读取；AI 对话逻辑（生成/标题等）仍在前端 Next 侧。
type Conversation struct {
	ID        string       `gorm:"primaryKey;type:text" json:"id"`
	UserID    string       `gorm:"type:text;not null;index:idx_conversations_user_updated,priority:1" json:"userId"`
	Title     string       `gorm:"type:text;not null;default:'新对话'" json:"title"`
	CreatedAt time.Time    `gorm:"not null" json:"createdAt"`
	UpdatedAt time.Time    `gorm:"not null;index:idx_conversations_user_updated,priority:2" json:"updatedAt"`
	Messages  MessagesJSON `gorm:"type:jsonb;not null" json:"messages"`
}

// ConversationSummary 对话列表摘要
type ConversationSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updatedAt"`
}