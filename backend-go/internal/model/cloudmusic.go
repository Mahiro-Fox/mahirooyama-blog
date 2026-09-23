// Package model
// cloudmusic.go 云音乐（网易云/QQ）模型，对齐 sonictopography 的 types.ts 结构
package model

// CloudSong 云音乐歌曲
type CloudSong struct {
	Provider string `json:"provider"`
	ID       any    `json:"id"`
	QQID     any    `json:"qqId,omitempty"`
	Mid      string `json:"mid,omitempty"`
	Songmid  string `json:"songmid,omitempty"`
	MediaMid string `json:"mediaMid,omitempty"`
	Cover    string `json:"cover"`
	Name     string `json:"name"`
	Artist   string `json:"artist"`
	Album    string `json:"album"`
	Duration int64  `json:"duration"`
	Fee      any    `json:"fee,omitempty"`
}

// CloudPlaylistSummary 云音乐歌单摘要
type CloudPlaylistSummary struct {
	Provider    string `json:"provider"`
	ID          any    `json:"id"`
	Name        string `json:"name"`
	TrackCount  int    `json:"trackCount"`
	LoadedCount int    `json:"loadedCount,omitempty"`
	Cover       string `json:"cover"`
	Creator     string `json:"creator,omitempty"`
	IsFavorite  bool   `json:"isFavorite,omitempty"`
}

// CloudPlaylistDetail 歌单详情（含歌曲列表）
type CloudPlaylistDetail struct {
	Provider    string      `json:"provider"`
	ID          any         `json:"id"`
	Name        string      `json:"name"`
	Cover       string      `json:"cover"`
	TrackCount  int         `json:"trackCount"`
	LoadedCount int         `json:"loadedCount"`
	Songs       []CloudSong `json:"songs"`
}

// CloudCookieRequestBody 保存云音乐 cookie 的请求体
type CloudCookieRequestBody struct {
	Provider string `json:"provider" binding:"required"`
	Cookie   string `json:"cookie"`
}

// CloudAccount 云音乐账号信息
type CloudAccount struct {
	Provider         string `json:"provider"`
	Valid            bool   `json:"valid"`
	UserID           any    `json:"userId"`
	Nickname         string `json:"nickname"`
	LoggedIn         bool   `json:"loggedIn,omitempty"`
	Avatar           string `json:"avatar,omitempty"`
	HasCookie        bool   `json:"hasCookie,omitempty"`
	PlaybackKeyReady bool   `json:"playbackKeyReady,omitempty"`
}

// CloudCookieStatus 云音乐 cookie 状态（GET /api/cloudmusic/cookie）
type CloudCookieStatus struct {
	Netease CloudAccount `json:"netease"`
	QQ      CloudAccount `json:"qq"`
}
