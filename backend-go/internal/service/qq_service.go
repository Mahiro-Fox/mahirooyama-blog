// Package service
// qq_service.go QQ 音乐业务逻辑（纯函数式），迁移自 sonic-topography/server/qq-music.mjs。
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"mahirooyama-blog/backend-go/internal/model"
)

const (
	qqMusicuURL       = "https://u.y.qq.com/cgi-bin/musicu.fcg"
	qqSmartboxURL     = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg"
	qqPlaylistListMax = 1000
)

var (
	qqUA      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
	qqHeaders = http.Header{
		"Referer":    []string{"https://y.qq.com/"},
		"User-Agent": []string{qqUA},
	}
	qqQualityCandidates = []qqQualityCandidate{
		{Prefix: "RS01", Ext: ".flac", Level: "hires", Label: "Hi-Res FLAC"},
		{Prefix: "F000", Ext: ".flac", Level: "lossless", Label: "Lossless FLAC"},
		{Prefix: "M800", Ext: ".mp3", Level: "exhigh", Label: "320k MP3"},
		{Prefix: "M500", Ext: ".mp3", Level: "standard", Label: "128k MP3"},
		{Prefix: "C400", Ext: ".m4a", Level: "aac", Label: "AAC/M4A"},
	}
)

type qqQualityCandidate struct {
	Prefix string
	Ext    string
	Level  string
	Label  string
}

// QQSongURLResult QQ 播放地址结果
type QQSongURLResult struct {
	Provider string `json:"provider"`
	URL      string `json:"url"`
	Playable bool   `json:"playable"`
	Level    string `json:"level"`
	Quality  string `json:"quality"`
	Message  string `json:"message,omitempty"`
}

// QQPlaylistsResult 用户歌单结果
type QQPlaylistsResult struct {
	LoggedIn  bool                         `json:"loggedIn"`
	Provider  string                       `json:"provider"`
	UserID    string                       `json:"userId,omitempty"`
	Playlists []model.CloudPlaylistSummary `json:"playlists"`
}

// QQPlaylistTracksResult 歌单内歌曲结果
type QQPlaylistTracksResult struct {
	LoggedIn bool              `json:"loggedIn"`
	Provider string            `json:"provider"`
	Playlist QQPlaylistDetail  `json:"playlist"`
	Songs    []model.CloudSong `json:"songs"`
	Tracks   []model.CloudSong `json:"tracks"`
}

// QQPlaylistDetail 歌单详情精简结构（与 Next 契约一致）
type QQPlaylistDetail struct {
	Provider    string `json:"provider"`
	ID          string `json:"id"`
	Name        string `json:"name"`
	Cover       string `json:"cover"`
	TrackCount  int    `json:"trackCount"`
	LoadedCount int    `json:"loadedCount"`
}

// QQLyricResult 歌词结果
type QQLyricResult struct {
	Provider string `json:"provider"`
	ID       string `json:"id,omitempty"`
	MID      string `json:"mid,omitempty"`
	Lyric    string `json:"lyric"`
	TLyric   string `json:"tlyric"`
	QRC      string `json:"qrc"`
	Roma     string `json:"roma"`
}

// --- cookie 解析与规范化 ---

func parseQQCookie(text string) map[string]string {
	out := map[string]string{}
	parts := strings.FieldsFunc(StringOrEmpty(text), func(r rune) bool {
		return r == ';' || r == '\n' || r == '\r'
	})
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		idx := strings.Index(part, "=")
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(part[:idx])
		value := strings.TrimSpace(strings.TrimRight(part[idx+1:], ";"))
		if key != "" && value != "" {
			out[key] = value
		}
	}
	return out
}

func serializeQQCookie(cookie map[string]string) string {
	parts := make([]string, 0, len(cookie))
	for k, v := range cookie {
		if k != "" && v != "" {
			parts = append(parts, k+"="+v)
		}
	}
	return strings.Join(parts, "; ")
}

func normalizeQQUin(raw string) string {
	digits := ""
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			digits += string(r)
		}
	}
	trimmed := strings.TrimLeft(digits, "0")
	if trimmed == "" {
		return digits
	}
	return trimmed
}

// NormalizeQQCookieInput 规范化 QQ 音乐 cookie 输入
func NormalizeQQCookieInput(cookieText string) string {
	cookie := parseQQCookie(cookieText)
	if loginType, _ := strconv.Atoi(cookie["login_type"]); loginType == 2 && cookie["wxuin"] != "" && cookie["uin"] == "" {
		cookie["uin"] = cookie["wxuin"]
	}
	if cookie["uin"] == "" {
		if cookie["qqmusic_uin"] != "" {
			cookie["uin"] = cookie["qqmusic_uin"]
		} else if cookie["p_uin"] != "" {
			cookie["uin"] = cookie["p_uin"]
		}
	}
	if cookie["uin"] != "" {
		cookie["uin"] = normalizeQQUin(cookie["uin"])
	}
	return serializeQQCookie(cookie)
}

func qqCookieObject(cookieText string) map[string]string {
	return parseQQCookie(NormalizeQQCookieInput(cookieText))
}

func qqCookieUin(cookie map[string]string) string {
	loginType, _ := strconv.Atoi(cookie["login_type"])
	var raw string
	if loginType == 2 {
		raw = firstNonEmpty(cookie["wxuin"], cookie["uin"], cookie["p_uin"])
	} else {
		raw = firstNonEmpty(cookie["uin"], cookie["qqmusic_uin"], cookie["wxuin"], cookie["p_uin"])
	}
	return normalizeQQUin(raw)
}

func qqCookieMusicKey(cookie map[string]string) string {
	return firstNonEmpty(cookie["qm_keyst"], cookie["qqmusic_key"], cookie["music_key"],
		cookie["p_skey"], cookie["skey"], cookie["psrf_qqaccess_token"],
		cookie["psrf_qqrefresh_token"], cookie["wxrefresh_token"], cookie["wxskey"])
}

func qqCookiePlaybackKey(cookie map[string]string) string {
	return firstNonEmpty(cookie["qm_keyst"], cookie["qqmusic_key"], cookie["music_key"], cookie["wxskey"])
}

func decodeCookieValue(value string) string {
	decoded, err := url.QueryUnescape(strings.ReplaceAll(StringOrEmpty(value), "+", "%20"))
	if err != nil {
		return strings.TrimSpace(value)
	}
	return strings.TrimSpace(decoded)
}

func qqCookieNickname(cookie map[string]string, uin string) string {
	padded := ""
	if uin != "" {
		padded = "0" + uin
	}
	keys := []string{}
	if uin != "" {
		keys = append(keys, "ptnick_"+uin)
	}
	if padded != "" {
		keys = append(keys, "ptnick_"+padded)
	}
	keys = append(keys, "ptnick", "nick", "nickname", "qq_nickname")
	for _, k := range keys {
		if v := cookie[k]; v != "" {
			return decodeCookieValue(v)
		}
	}
	return ""
}

func qqCookieAvatar(cookie map[string]string, uin string) string {
	if direct := firstNonEmpty(cookie["qqmusic_avatar"], cookie["avatar"], cookie["avatarUrl"], cookie["headpic"]); direct != "" {
		return decodeCookieValue(direct)
	}
	if uin != "" {
		return "https://q1.qlogo.cn/g?b=qq&nk=" + url.QueryEscape(uin) + "&s=100"
	}
	return ""
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func firstNonEmptyAny(vals ...any) any {
	for _, v := range vals {
		if v != nil && ToString(v) != "" {
			return v
		}
	}
	return ""
}

// QQProfile 从 cookie 解析 QQ 账号信息
func QQProfile(cookieText string) model.CloudAccount {
	cookie := qqCookieObject(cookieText)
	userID := qqCookieUin(cookie)
	musicKey := qqCookieMusicKey(cookie)
	nickname := qqCookieNickname(cookie, userID)
	if nickname == "" {
		if userID != "" {
			nickname = "QQ " + userID
		} else {
			nickname = "QQ 音乐"
		}
	}
	return model.CloudAccount{
		Provider:         "qq",
		LoggedIn:         userID != "" && musicKey != "",
		UserID:           userID,
		Nickname:         nickname,
		Avatar:           qqCookieAvatar(cookie, userID),
		HasCookie:        cookieText != "",
		PlaybackKeyReady: userID != "" && qqCookiePlaybackKey(cookie) != "",
	}
}

// --- HTTP 基础 ---

func buildQQHeaders(extra http.Header) http.Header {
	h := qqHeaders.Clone()
	for k, vv := range extra {
		for _, v := range vv {
			h.Add(k, v)
		}
	}
	return h
}

func qqFetchText(ctx context.Context, client *http.Client, targetURL string, headers http.Header) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return "", err
	}
	req.Header = buildQQHeaders(headers)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return string(body), fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return string(body), nil
}

func parseJSONText(text string) map[string]any {
	raw := strings.TrimSpace(text)
	raw = strings.TrimSuffix(raw, ";")
	if i := strings.Index(raw, "("); i >= 0 && strings.HasPrefix(raw, "callback") {
		raw = strings.TrimSuffix(strings.TrimSpace(raw[i+1:]), ")")
	}
	data := map[string]any{}
	_ = json.Unmarshal([]byte(raw), &data)
	return data
}

func qqGetJSON(ctx context.Context, client *http.Client, targetURL string, params map[string]string, cookieText string, useCookie bool, headers http.Header) map[string]any {
	u, _ := url.Parse(targetURL)
	query := u.Query()
	for k, v := range params {
		query.Set(k, v)
	}
	u.RawQuery = query.Encode()
	h := http.Header{}
	if !useCookie && cookieText != "" {
		h.Set("Cookie", cookieText)
	}
	mergeHeaders(h, headers)
	text, err := qqFetchText(ctx, client, u.String(), h)
	if err != nil {
		return map[string]any{}
	}
	return parseJSONText(text)
}

func mergeHeaders(dst, src http.Header) {
	for k, vv := range src {
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}

// qqMusicRequest 向 musicu.fcg 发起 JSON 请求
func qqMusicRequest(ctx context.Context, client *http.Client, payload map[string]any, cookieText string, useCookie bool) map[string]any {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, qqMusicuURL, strings.NewReader(string(body)))
	if err != nil {
		return map[string]any{}
	}
	headers := http.Header{"Content-Type": {"application/json;charset=UTF-8"}}
	if useCookie && cookieText != "" {
		headers.Set("Cookie", cookieText)
	}
	req.Header = buildQQHeaders(headers)
	resp, err := client.Do(req)
	if err != nil {
		return map[string]any{}
	}
	defer resp.Body.Close()
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return map[string]any{}
	}
	return parseJSONText(string(buf))
}

// --- 歌曲映射 ---

func mapQQArtists(raw []any) []map[string]any {
	out := make([]map[string]any, 0, len(raw))
	for _, r := range raw {
		if m, ok := r.(map[string]any); ok {
			name, _ := m["name"].(string)
			if name == "" {
				name, _ = m["title"].(string)
			}
			if name != "" {
				out = append(out, m)
			}
		}
	}
	return out
}

func rawQQAlbumCover(albumMid string, size int) string {
	if albumMid == "" {
		return ""
	}
	return "https://y.qq.com/music/photo_new/T002R" + strconv.Itoa(size) + "x" + strconv.Itoa(size) +
		"M000" + albumMid + ".jpg?max_age=2592000"
}

func qqAlbumCover(albumMid string, size int) string {
	if albumMid == "" {
		return ""
	}
	return "/api/cloudmusic/qq/cover?id=" + albumMid + "&size=" + strconv.Itoa(size)
}

func mapQQSmartSong(item map[string]any) model.CloudSong {
	mid := firstNonEmpty(toStringAny(item["mid"]), toStringAny(item["songmid"]), toStringAny(item["id"]))
	return model.CloudSong{
		Provider: "qq",
		ID:       mid,
		QQID:     firstNonEmptyAny(item["id"], item["docid"]),
		Mid:      mid,
		Songmid:  mid,
		Name:     firstNonEmpty(toStringAny(item["name"]), toStringAny(item["title"])),
		Artist:   toStringAny(item["singer"]),
	}
}

func toStringAny(v any) string {
	return ToString(v)
}

func mapQQTrack(track map[string]any, rawClones []map[string]any) model.CloudSong {
	album, _ := track["album"].(map[string]any)
	artists := mapQQArtists(asAnySlice(track["singer"]))
	mid := firstNonEmpty(toStringAny(track["mid"]), fallbackField(rawClones, "mid"), fallbackField(rawClones, "songmid"), fallbackField(rawClones, "id"))
	albumMid := ""
	if album != nil {
		albumMid = firstNonEmpty(toStringAny(album["mid"]), toStringAny(album["pmid"]))
	}
	mediaMid := ""
	if file, ok := track["file"].(map[string]any); ok {
		mediaMid = toStringAny(file["media_mid"])
	}
	name := firstNonEmpty(toStringAny(track["name"]), toStringAny(track["title"]), fallbackField(rawClones, "name"))
	var arNames []string
	for _, a := range artists {
		if n, _ := a["name"].(string); n != "" {
			arNames = append(arNames, n)
		}
	}
	artist := strings.Join(arNames, " / ")
	if artist == "" {
		artist = fallbackField(rawClones, "artist")
	}
	duration := ToInt64(track["interval"]) * 1000
	var fee any
	if pay, ok := track["pay"].(map[string]any); ok {
		if n, _ := pay["pay_play"].(float64); n > 0 {
			fee = 1
		}
	}
	return model.CloudSong{
		Provider: "qq",
		ID:       mid,
		QQID:     firstNonEmptyAny(track["id"], fallbackFieldAny(rawClones, "qqId")),
		Mid:      mid,
		Songmid:  mid,
		MediaMid: mediaMid,
		Name:     name,
		Artist:   artist,
		Album:    firstNonEmpty(albumName(album), fallbackField(rawClones, "album")),
		Cover:    qqAlbumCover(albumMid, 300),
		Duration: duration,
		Fee:      fee,
	}
}

func fallbackField(rawClones []map[string]any, key string) string {
	for _, m := range rawClones {
		if v, ok := m[key].(string); ok && v != "" {
			return v
		}
	}
	return ""
}

func fallbackFieldAny(rawClones []map[string]any, key string) any {
	for _, m := range rawClones {
		if v, ok := m[key]; ok && v != nil {
			return v
		}
	}
	return nil
}

func asAnySlice(v any) []any {
	if s, ok := v.([]any); ok {
		return s
	}
	return nil
}

func albumName(album map[string]any) string {
	if album == nil {
		return ""
	}
	return firstNonEmpty(toStringAny(album["name"]), toStringAny(album["title"]))
}

// --- 搜索 ---

func qqSmartboxSearch(ctx context.Context, client *http.Client, keywords string, limit int) []model.CloudSong {
	u, _ := url.Parse(qqSmartboxURL)
	query := u.Query()
	query.Set("format", "json")
	query.Set("key", keywords)
	query.Set("g_tk", "5381")
	query.Set("loginUin", "0")
	query.Set("hostUin", "0")
	query.Set("inCharset", "utf8")
	query.Set("outCharset", "utf-8")
	query.Set("notice", "0")
	query.Set("platform", "yqq.json")
	query.Set("needNewCode", "0")
	u.RawQuery = query.Encode()
	text, err := qqFetchText(ctx, client, u.String(), nil)
	if err != nil {
		return nil
	}
	data := parseJSONText(text)
	d, _ := data["data"].(map[string]any)
	song, _ := d["song"].(map[string]any)
	items, _ := song["itemlist"].([]any)
	cap := limit
	if cap < 1 {
		cap = 8
	}
	if cap > 12 {
		cap = 12
	}
	if len(items) > cap {
		items = items[:cap]
	}
	songs := make([]model.CloudSong, 0, len(items))
	for _, it := range items {
		if m, ok := it.(map[string]any); ok {
			songs = append(songs, mapQQSmartSong(m))
		}
	}
	return songs
}

func qqSongDetail(ctx context.Context, client *http.Client, mid string, fallback model.CloudSong) model.CloudSong {
	if mid == "" {
		return fallback
	}
	payload := map[string]any{
		"comm": map[string]any{"ct": 24, "cv": 0},
		"songinfo": map[string]any{
			"module": "music.pf_song_detail_svr",
			"method": "get_song_detail_yqq",
			"param":  map[string]any{"song_mid": mid},
		},
	}
	data := qqMusicRequest(ctx, client, payload, "", false)
	si, _ := data["songinfo"].(map[string]any)
	d, _ := si["data"].(map[string]any)
	track, _ := d["track_info"].(map[string]any)
	return mapQQTrack(track, []map[string]any{fallbackToMap(fallback)})
}

func fallbackToMap(s model.CloudSong) map[string]any {
	return map[string]any{
		"mid": s.Mid, "songmid": s.Songmid, "id": s.ID, "name": s.Name,
		"artist": s.Artist, "album": s.Album, "qqId": s.QQID,
	}
}

// handleQQSearch QQ 搜索（smartbox → 详情）
func handleQQSearch(ctx context.Context, client *http.Client, keywords string, limit int) []model.CloudSong {
	query := strings.TrimSpace(keywords)
	if query == "" {
		return nil
	}
	base := qqSmartboxSearch(ctx, client, query, limit)
	songs := make([]model.CloudSong, 0, len(base))
	seen := map[string]bool{}
	for _, song := range base {
		key := firstNonEmpty(song.Songmid, toStringAny(song.ID), song.Name+"|"+song.Artist)
		if key == "" || seen[key] || song.Name == "" {
			continue
		}
		seen[key] = true
		songs = append(songs, song)
	}
	return songs
}

// QQSearch QQ 音乐搜索（公开读）
func QQSearch(ctx context.Context, client *http.Client, keywords string, limit int) []model.CloudSong {
	return handleQQSearch(ctx, client, keywords, limit)
}

// --- 播放地址 ---

func normalizeQualityPreference(value string) string {
	raw := strings.ToLower(strings.TrimSpace(value))
	switch raw {
	case "lossless", "flac", "sq":
		return "lossless"
	case "exhigh", "high", "320", "320k", "hq":
		return "exhigh"
	case "standard", "normal", "128", "128k", "std":
		return "standard"
	case "aac", "m4a":
		return "aac"
	}
	return "exhigh"
}

func qualityCandidatesFrom(target string) []qqQualityCandidate {
	pref := normalizeQualityPreference(target)
	index := -1
	for i, c := range qqQualityCandidates {
		if c.Level == pref {
			index = i
			break
		}
	}
	if index < 0 {
		index = 0
	}
	return qqQualityCandidates[index:]
}

// QQSongURL 获取 QQ 音乐播放地址（vkey）
func QQSongURL(ctx context.Context, client *http.Client, mid, mediaMid, qualityPreference, cookieText string) QQSongURLResult {
	songmid := strings.TrimSpace(mid)
	if songmid == "" {
		return QQSongURLResult{Provider: "qq", URL: "", Playable: false, Message: "MISSING_MID"}
	}
	cookie := qqCookieObject(cookieText)
	userID := qqCookieUin(cookie)
	if userID == "" {
		userID = "0"
	}
	musicKey := qqCookieMusicKey(cookie)

	var ids []string
	for _, v := range []string{mediaMid, songmid} {
		v = strings.TrimSpace(v)
		if v != "" {
			ids = append(ids, v)
		}
	}
	unique := []string{}
	seen := map[string]bool{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			unique = append(unique, id)
		}
	}

	candidates := qualityCandidatesFrom(qualityPreference)
	var filenames []string
	fileInfos := []map[string]any{}
	for _, id := range unique {
		for _, cand := range candidates {
			fn := cand.Prefix + id + cand.Ext
			filenames = append(filenames, fn)
			fileInfos = append(fileInfos, map[string]any{
				"filename": fn, "level": cand.Level, "label": cand.Label,
			})
		}
	}

	songtypes := make([]any, 0, len(filenames))
	for range filenames {
		songtypes = append(songtypes, 0)
	}

	param := map[string]any{
		"guid":      strconv.Itoa(10000000 + rand.Intn(90000000)),
		"songmid":   filenamesList(filenames, songmid),
		"songtype":  songtypes,
		"uin":       userID,
		"loginflag": 1,
		"platform":  "20",
	}
	if len(filenames) > 0 {
		param["filename"] = filenames
	}

	ct := 24
	if musicKey != "" {
		ct = 19
	}
	comm := map[string]any{"uin": userID, "format": "json", "ct": ct, "cv": 0}
	if musicKey != "" {
		comm["authst"] = musicKey
	}
	payload := map[string]any{
		"comm": comm,
		"req_0": map[string]any{
			"module": "vkey.GetVkeyServer",
			"method": "CgiGetVkey",
			"param":  param,
		},
	}
	data := qqMusicRequest(ctx, client, payload, cookieText, true)
	req0, _ := data["req_0"].(map[string]any)
	responseData, _ := req0["data"].(map[string]any)
	info := qqFirstPurlInfo(responseData)
	purl := toStringAny(info["purl"])
	if purl != "" {
		sip := "https://ws.stream.qqmusic.qq.com/"
		if sips, ok := responseData["sip"].([]any); ok && len(sips) > 0 {
			if s, _ := sips[0].(string); s != "" {
				sip = s
			}
		}
		level := ""
		quality := ""
		for _, fi := range fileInfos {
			if toStringAny(fi["filename"]) == toStringAny(info["filename"]) {
				level, _ = fi["level"].(string)
				quality, _ = fi["label"].(string)
				break
			}
		}
		if level == "" {
			level = toStringAny(info["filename"])
		}
		if quality == "" {
			quality = toStringAny(info["filename"])
		}
		return QQSongURLResult{
			Provider: "qq",
			URL:      sip + purl,
			Playable: true,
			Level:    level,
			Quality:  quality,
		}
	}
	message := "QQ 音乐需要登录后才能获取播放地址"
	if musicKey != "" {
		message = "QQ 音乐没有返回可播放地址，可能受版权、会员或地区限制"
	}
	return QQSongURLResult{Provider: "qq", URL: "", Playable: false, Message: message}
}

func filenamesList(filenames []string, songmid string) []any {
	if len(filenames) == 0 {
		return []any{songmid}
	}
	out := make([]any, len(filenames))
	for i := range filenames {
		out[i] = songmid
	}
	return out
}

func qqFirstPurlInfo(responseData map[string]any) map[string]any {
	infos, _ := responseData["midurlinfo"].([]any)
	for _, i := range infos {
		if m, ok := i.(map[string]any); ok {
			if purl, _ := m["purl"].(string); purl != "" {
				return m
			}
		}
	}
	if len(infos) > 0 {
		if m, ok := infos[0].(map[string]any); ok {
			return m
		}
	}
	return map[string]any{}
}

// --- 歌词 ---

func decodeQQLyricText(text string) string {
	raw := decodeHTMLEntities(text)
	raw = strings.TrimSpace(raw)
	compact := strings.Join(strings.Fields(raw), "")
	looksBase64 := len(compact) >= 8 && len(compact)%4 == 0 && base64Ptn.MatchString(compact) && !strings.HasPrefix(raw, "[")
	if looksBase64 {
		if decoded := decodeMaybeBase64(compact); decoded != "" {
			raw = decoded
		}
	}
	return strings.TrimSpace(strings.ReplaceAll(decodeHTMLEntities(raw), "\r\n", "\n"))
}

// QQLyric 获取 QQ 音乐歌词
func QQLyric(ctx context.Context, client *http.Client, mid, id, cookieText string) QQLyricResult {
	songMID := strings.TrimSpace(mid)
	songID := ""
	for _, r := range id {
		if r >= '0' && r <= '9' {
			songID += string(r)
		}
	}
	if songMID == "" && songID == "" {
		return QQLyricResult{Provider: "qq", Lyric: ""}
	}
	param := map[string]any{}
	if songMID != "" {
		param["songMID"] = songMID
	}
	if songID != "" {
		param["songID"], _ = strconv.Atoi(songID)
	}
	payload := map[string]any{
		"comm": map[string]any{"ct": 24, "cv": 0},
		"lyric": map[string]any{
			"module": "music.musichallSong.PlayLyricInfo",
			"method": "GetPlayLyricInfo",
			"param":  param,
		},
	}
	data := qqMusicRequest(ctx, client, payload, cookieText, true)
	lyricData, _ := data["lyric"].(map[string]any)
	d, _ := lyricData["data"].(map[string]any)
	return QQLyricResult{
		Provider: "qq",
		ID:       songID,
		MID:      songMID,
		Lyric:    decodeQQLyricText(toStringAny(d["lyric"])),
		TLyric:   decodeQQLyricText(toStringAny(d["trans"])),
		QRC:      decodeQQLyricText(toStringAny(d["qrc"])),
		Roma:     decodeQQLyricText(toStringAny(d["roma"])),
	}
}

// --- 歌单 ---

func mapQQPlaylistSummary(playlist map[string]any, kind string) model.CloudPlaylistSummary {
	id := firstNonEmpty(toStringAny(playlist["dissid"]), toStringAny(playlist["tid"]),
		toStringAny(playlist["dirid"]), toStringAny(playlist["id"]), toStringAny(playlist["diss_id"]))
	name := firstNonEmpty(toStringAny(playlist["diss_name"]), toStringAny(playlist["name"]), toStringAny(playlist["title"]))
	cover := firstNonEmpty(toStringAny(playlist["diss_cover"]), toStringAny(playlist["logo"]),
		toStringAny(playlist["picurl"]), toStringAny(playlist["cover"]))
	trackCount := ToInt64(playlist["song_cnt"])
	if trackCount == 0 {
		trackCount = ToInt64(playlist["songnum"])
	}
	if trackCount == 0 {
		trackCount = ToInt64(playlist["total_song_num"])
	}
	if trackCount == 0 {
		trackCount = ToInt64(playlist["song_count"])
	}
	creator := firstNonEmpty(toStringAny(playlist["hostname"]), toStringAny(playlist["nick"]), toStringAny(playlist["creator"]), "QQ 音乐")
	s := model.CloudPlaylistSummary{
		Provider:   "qq",
		ID:         id,
		Name:       name,
		TrackCount: int(trackCount),
		Cover:      cover,
		Creator:    creator,
		IsFavorite: isQQFavoritePlaylistName(name) || kind == "collect",
	}
	return s
}

func isQQFavoritePlaylistName(name string) bool {
	return regexMatch(`我喜欢|我的喜欢|喜欢的音乐|喜爱的音乐|favorite`, strings.TrimSpace(name))
}

func isQzoneBackgroundPlaylist(playlist map[string]any) bool {
	text := strings.ToLower(toStringAny(playlist["name"]) + " " + toStringAny(playlist["creator"]))
	return regexMatch(`qzone|空间|背景音乐|background`, text)
}

// QQUserPlaylists 获取用户创建+收藏的歌单
func QQUserPlaylists(ctx context.Context, client *http.Client, cookieText string) QQPlaylistsResult {
	profile := QQProfile(cookieText)
	if !profile.LoggedIn || toStringAny(profile.UserID) == "" {
		return QQPlaylistsResult{LoggedIn: false, Provider: "qq", Playlists: []model.CloudPlaylistSummary{}}
	}
	uin := toStringAny(profile.UserID)
	profileReferer := http.Header{"Referer": {"https://y.qq.com/portal/profile.html"}}

	created := qqGetJSON(ctx, client, "https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss", map[string]string{
		"hostUin": "0", "hostuin": uin, "sin": "0", "size": strconv.Itoa(qqPlaylistListMax),
		"g_tk": "5381", "loginUin": uin, "format": "json", "inCharset": "utf8",
		"outCharset": "utf-8", "notice": "0", "platform": "yqq.json", "needNewCode": "0",
	}, cookieText, true, profileReferer)
	collected := qqGetJSON(ctx, client, "https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg", map[string]string{
		"ct": "20", "cid": "205360956", "userid": uin, "reqtype": "3",
		"sin": "0", "ein": strconv.Itoa(qqPlaylistListMax - 1),
	}, cookieText, true, profileReferer)

	var lists []model.CloudPlaylistSummary
	if d, ok := created["data"].(map[string]any); ok {
		if diss, ok := d["disslist"].([]any); ok {
			for _, r := range diss {
				if m, ok := r.(map[string]any); ok {
					lists = append(lists, mapQQPlaylistSummary(m, "created"))
				}
			}
		}
	}
	if d, ok := collected["data"].(map[string]any); ok {
		if cd, ok := d["cdlist"].([]any); ok {
			for _, r := range cd {
				if m, ok := r.(map[string]any); ok {
					lists = append(lists, mapQQPlaylistSummary(m, "collect"))
				}
			}
		}
	}
	seen := map[string]bool{}
	out := make([]model.CloudPlaylistSummary, 0, len(lists))
	for _, p := range lists {
		id := toStringAny(p.ID)
		if id == "" || p.Name == "" || seen[id] || isQzoneBackgroundPlaylist(map[string]any{"name": p.Name, "creator": p.Creator}) {
			continue
		}
		seen[id] = true
		out = append(out, p)
	}
	return QQPlaylistsResult{LoggedIn: true, Provider: "qq", UserID: uin, Playlists: out}
}

// mapQQPlaylistTrack 映射歌单内歌曲
func mapQQPlaylistTrack(raw map[string]any) model.CloudSong {
	source := raw
	song := raw
	hasDirect := false
	for _, k := range []string{"songid", "songmid", "mid", "name"} {
		if _, ok := raw[k]; ok {
			hasDirect = true
			break
		}
	}
	if !hasDirect {
		for _, k := range []string{"track_info", "songInfo", "songinfo", "song"} {
			if m, ok := raw[k].(map[string]any); ok {
				song = m
				break
			}
		}
	}
	album, _ := song["album"].(map[string]any)
	artists := mapQQArtists(asAnySlice(song["singer"]))
	if len(artists) == 0 {
		artists = mapQQArtists(asAnySlice(song["singers"]))
	}
	mid := firstNonEmpty(toStringAny(song["mid"]), toStringAny(song["songmid"]), toStringAny(source["mid"]), toStringAny(source["songmid"]))
	albumMid := firstNonEmpty(albumMidOf(album), toStringAny(song["albummid"]), toStringAny(source["albummid"]))
	mediaMid := ""
	if file, ok := song["file"].(map[string]any); ok {
		mediaMid = toStringAny(file["media_mid"])
	}
	if mediaMid == "" {
		mediaMid = firstNonEmpty(toStringAny(song["strMediaMid"]), toStringAny(song["media_mid"]), toStringAny(source["strMediaMid"]))
	}
	name := firstNonEmpty(toStringAny(song["name"]), toStringAny(song["title"]), toStringAny(song["songname"]), toStringAny(source["songname"]), toStringAny(source["title"]))
	var arNames []string
	for _, a := range artists {
		if n, _ := a["name"].(string); n != "" {
			arNames = append(arNames, n)
		}
	}
	artist := strings.Join(arNames, " / ")
	if artist == "" {
		artist = firstNonEmpty(toStringAny(song["singername"]), toStringAny(source["singername"]))
	}
	albumNameVal := albumName(album)
	if albumNameVal == "" {
		albumNameVal = firstNonEmpty(toStringAny(song["albumname"]), toStringAny(source["albumname"]))
	}
	interval := ToInt64(song["interval"])
	if interval == 0 {
		interval = ToInt64(source["interval"])
	}
	var fee any
	if pay, ok := song["pay"].(map[string]any); ok {
		if n, _ := pay["pay_play"].(float64); n > 0 {
			fee = 1
		}
	}
	qqIDVal := firstNonEmptyAny(song["id"], song["songid"], source["id"], source["songid"])
	idVal := mid
	if idVal == "" {
		idVal = ToString(qqIDVal)
	}
	return model.CloudSong{
		Provider: "qq",
		ID:       idVal,
		QQID:     qqIDVal,
		Mid:      mid,
		Songmid:  mid,
		MediaMid: mediaMid,
		Name:     name,
		Artist:   artist,
		Album:    albumNameVal,
		Cover:    qqAlbumCover(albumMid, 300),
		Duration: interval * 1000,
		Fee:      fee,
	}
}

func albumMidOf(album map[string]any) string {
	if album == nil {
		return ""
	}
	return firstNonEmpty(toStringAny(album["mid"]), toStringAny(album["pmid"]))
}

func fetchQQPlaylistTracksByMusicu(ctx context.Context, client *http.Client, playlistID string, trackLimit int, cookieText string, profile model.CloudAccount) []map[string]any {
	data := qqMusicRequest(ctx, client, map[string]any{
		"comm": map[string]any{"ct": 24, "cv": 0, "g_tk": 5381, "uin": toStringAny(profile.UserID),
			"format": "json", "platform": "yqq.json"},
		"req": map[string]any{
			"module": "music.srfDissInfo.aiDissInfo",
			"method": "uniform_get_Dissinfo",
			"param":  map[string]any{"disstid": playlistID, "song_begin": 0, "song_num": trackLimit, "userinfo": 1, "tag": 1},
		},
	}, cookieText, cookieText != "")
	req, _ := data["req"].(map[string]any)
	d, _ := req["data"].(map[string]any)
	songlist, _ := d["songlist"].([]any)
	out := make([]map[string]any, 0, len(songlist))
	for _, s := range songlist {
		if m, ok := s.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

// QQPlaylistTracks 获取 QQ 歌单内歌曲
func QQPlaylistTracks(ctx context.Context, client *http.Client, id string, limit int, cookieText string) QQPlaylistTracksResult {
	profile := QQProfile(cookieText)
	if !profile.LoggedIn || toStringAny(profile.UserID) == "" {
		return QQPlaylistTracksResult{LoggedIn: false, Provider: "qq", Songs: []model.CloudSong{}, Tracks: []model.CloudSong{}}
	}
	playlistID := strings.TrimSpace(id)
	trackLimit := limit
	if trackLimit <= 0 {
		trackLimit = 500
	}
	if trackLimit > 2000 {
		trackLimit = 2000
	}
	data := qqGetJSON(ctx, client, "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg", map[string]string{
		"type": "1", "utf8": "1", "disstid": playlistID, "loginUin": toStringAny(profile.UserID),
		"format": "json", "inCharset": "utf8", "outCharset": "utf-8", "notice": "0",
		"platform": "yqq.json", "needNewCode": "0",
	}, cookieText, true, http.Header{"Referer": {"https://y.qq.com/n/yqq/playlist"}})

	var detail map[string]any
	if cd, ok := data["cdlist"].([]any); ok && len(cd) > 0 {
		detail, _ = cd[0].(map[string]any)
	}
	songlist, _ := detail["songlist"].([]any)
	rawTracks := make([]map[string]any, 0, len(songlist))
	for _, s := range songlist {
		if m, ok := s.(map[string]any); ok {
			rawTracks = append(rawTracks, m)
		}
	}
	if len(rawTracks) < trackLimit {
		if mu := fetchQQPlaylistTracksByMusicu(ctx, client, playlistID, trackLimit, cookieText, profile); len(mu) > len(rawTracks) {
			rawTracks = mu
		}
	}
	songs := make([]model.CloudSong, 0, len(rawTracks))
	for _, t := range rawTracks {
		s := mapQQPlaylistTrack(t)
		if s.Name != "" && (s.Mid != "" || toStringAny(s.ID) != "") {
			songs = append(songs, s)
		}
	}
	if len(songs) > trackLimit {
		songs = songs[:trackLimit]
	}
	name := firstNonEmpty(toStringAny(detail["dissname"]), toStringAny(detail["diss_name"]), toStringAny(detail["name"]))
	cover := firstNonEmpty(toStringAny(detail["logo"]), toStringAny(detail["diss_cover"]))
	trackCount := ToInt64(detail["total_song_num"])
	if trackCount == 0 {
		trackCount = ToInt64(detail["songnum"])
	}
	if trackCount == 0 {
		trackCount = ToInt64(detail["song_count"])
	}
	if int(trackCount) == 0 {
		trackCount = int64(len(songs))
	}
	return QQPlaylistTracksResult{
		LoggedIn: true,
		Provider: "qq",
		Playlist: QQPlaylistDetail{
			Provider: "qq", ID: playlistID, Name: name, Cover: cover,
			TrackCount: int(trackCount), LoadedCount: len(songs),
		},
		Songs:  songs,
		Tracks: songs,
	}
}

// RQQCoverURL 构建 QQ 封面上游地址
func RQQCoverURL(albumMid string, size int) string {
	return rawQQAlbumCover(albumMid, size)
}

// regexMatch 简单正则匹配
func regexMatch(pattern, text string) bool {
	re, err := compileRegex(pattern)
	if err != nil {
		return false
	}
	return re.MatchString(text)
}
