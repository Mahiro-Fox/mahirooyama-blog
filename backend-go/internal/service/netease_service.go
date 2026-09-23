// Package service
// netease_service.go 网易云音乐业务逻辑（纯函数式），迁移自 sonic-topography/server/netease-service.mjs。
package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"mahirooyama-blog/backend-go/internal/model"
)

const (
	neteaseDefaultBitrate        = "320000"
	neteasePlayerURLCacheTTL     = 10 * time.Minute
	neteaseMaxPlaylists          = 5000
	neteasePlaylistPageLimit     = 1000
	neteaseMaxPlaylistTracks     = 2000
	neteaseDefaultPlaylistTracks = 500
)

var (
	neteaseHeaders = http.Header{
		"Referer":    []string{"https://music.163.com/"},
		"User-Agent": []string{"Mozilla/5.0"},
		"Accept":     []string{"application/json, text/plain, */*"},
		"Connection": []string{"close"},
	}

	neteasePlayableURLCache = newTTLCache[string, string](neteasePlayerURLCacheTTL)
)

// NormalizeNeteaseCookie 规范化网易云 cookie 字符串（按行拆分、去空格与分号、以 "; " 连接）
func NormalizeNeteaseCookie(value string) string {
	raw := StringOrEmpty(value)
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	lines := strings.Split(raw, "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(strings.TrimRight(line, ";"))
		if line != "" {
			out = append(out, line)
		}
	}
	return strings.Join(out, "; ")
}

// CreateNeteaseHeaders 构造网易云请求头
func CreateNeteaseHeaders(cookie string, extra http.Header) http.Header {
	h := neteaseHeaders.Clone()
	if c := NormalizeNeteaseCookie(cookie); c != "" {
		h.Set("Cookie", c)
	}
	for k, vv := range extra {
		for _, v := range vv {
			h.Add(k, v)
		}
	}
	return h
}

// NormalizeNeteaseBitrate 规范化码率（仅允许 320k/192k/128k）
func NormalizeNeteaseBitrate(value string) string {
	raw := strings.TrimSpace(StringOrEmpty(value))
	switch raw {
	case "320000", "192000", "128000":
		return raw
	default:
		return neteaseDefaultBitrate
	}
}

// BuildNeteasePlayerURL 构建网易云播放地址 API URL
func BuildNeteasePlayerURL(id any, bitrate string) string {
	encodedID := url.QueryEscape(ToString(id))
	return "https://music.163.com/api/song/enhance/player/url?id=" + encodedID +
		"&ids=%5B" + encodedID + "%5D&br=" + NormalizeNeteaseBitrate(bitrate)
}

// NeteasePlayableURLCacheKey 播放地址缓存 key
func NeteasePlayableURLCacheKey(id any, cookie, bitrate string) string {
	return ToString(id) + "::" + NormalizeNeteaseCookie(cookie) + "::" + NormalizeNeteaseBitrate(bitrate)
}

// GetNeteasePlayableURL 获取可播放地址（带 TTL 缓存）
func GetNeteasePlayableURL(ctx context.Context, client *http.Client, id any, cookie string, bitrate string) string {
	normalizedCookie := NormalizeNeteaseCookie(cookie)
	normalizedBitrate := NormalizeNeteaseBitrate(bitrate)
	key := NeteasePlayableURLCacheKey(id, normalizedCookie, normalizedBitrate)
	if cached, ok := neteasePlayableURLCache.Get(key); ok {
		return cached
	}
	build := func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, BuildNeteasePlayerURL(id, normalizedBitrate), nil)
	}
	data := fetchJSON(ctx, client, buildNeteaseWithHeaders(build, normalizedCookie), 2)
	var playableURL string
	if arr, ok := data["data"].([]any); ok && len(arr) > 0 {
		if first, ok := arr[0].(map[string]any); ok {
			playableURL, _ = first["url"].(string)
		}
	}
	if playableURL != "" {
		neteasePlayableURLCache.Set(key, playableURL)
	}
	return playableURL
}

// buildNeteaseWithHeaders 包装一个 request 构造器，为其附加网易云请求头
func buildNeteaseWithHeaders(build func() (*http.Request, error), cookie string) func() (*http.Request, error) {
	return func() (*http.Request, error) {
		req, err := build()
		if err != nil {
			return nil, err
		}
		req.Header = CreateNeteaseHeaders(cookie, nil)
		return req, nil
	}
}

// mapNeteaseSong 将网易云原始歌曲映射为 CloudSong
// artist 用 " / " 拼接，cover 取专辑 picUrl，id 保留原数值
func mapNeteaseSong(song map[string]any) model.CloudSong {
	artists, _ := song["artists"].([]any)
	if len(artists) == 0 {
		if ar, ok := song["ar"].([]any); ok {
			artists = ar
		}
	}
	var names []string
	for _, a := range artists {
		if m, ok := a.(map[string]any); ok {
			if n, _ := m["name"].(string); n != "" {
				names = append(names, n)
			}
		}
	}

	album, _ := song["album"].(map[string]any)
	if album == nil {
		album, _ = song["al"].(map[string]any)
	}
	albumName, _ := album["name"].(string)
	cover, _ := album["picUrl"].(string)
	if cover == "" {
		cover, _ = album["blurPicUrl"].(string)
	}
	if cover == "" {
		cover, _ = album["img80x80"].(string)
	}
	duration := ToInt64(song["duration"])
	if duration == 0 {
		duration = ToInt64(song["dt"])
	}
	return model.CloudSong{
		Provider: "netease",
		ID:       song["id"],
		Name:     toStringKey(song, "name"),
		Artist:   strings.Join(names, " / "),
		Album:    albumName,
		Cover:    cover,
		Duration: duration,
		Fee:      song["fee"],
	}
}

func toStringKey(m map[string]any, key string) string {
	s, _ := m[key].(string)
	return s
}

// neteaseSongsFromResult 从 {result:{songs:[]}} 提取歌曲
func neteaseSongsFromResult(data map[string]any) []model.CloudSong {
	result, _ := data["result"].(map[string]any)
	if raw, _ := result["songs"].([]any); len(raw) > 0 {
		return neteaseSongsFromList(raw)
	}
	return nil
}

func neteaseSongsFromList(raw []any) []model.CloudSong {
	songs := make([]model.CloudSong, 0, len(raw))
	for _, r := range raw {
		if m, ok := r.(map[string]any); ok {
			songs = append(songs, mapNeteaseSong(m))
		}
	}
	return songs
}

// NeteaseSearch 网易云搜索（主接口 + fallback，按 id 去重）
func NeteaseSearch(ctx context.Context, client *http.Client, keywords string, resultLimit int, cookie string) []model.CloudSong {
	upstreamLimit := resultLimit * 5
	if upstreamLimit > 80 {
		upstreamLimit = 80
	}
	form := url.Values{}
	form.Set("s", keywords)
	form.Set("type", "1")
	form.Set("offset", "0")
	form.Set("total", "true")
	form.Set("limit", strconv.Itoa(upstreamLimit))
	form.Set("_", strconv.FormatInt(time.Now().UnixMilli(), 10))

	primary := fetchJSON(ctx, client, func() (*http.Request, error) {
		req, err := http.NewRequest(http.MethodPost, "https://music.163.com/api/search/get/web", strings.NewReader(form.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header = CreateNeteaseHeaders(cookie, http.Header{"Content-Type": {"application/x-www-form-urlencoded"}})
		return req, nil
	}, 2)
	primarySongs := neteaseSongsFromResult(primary)

	fallbackURL, _ := url.Parse("https://music.163.com/api/cloudsearch/pc")
	q := fallbackURL.Query()
	q.Set("s", keywords)
	q.Set("type", "1")
	q.Set("offset", "0")
	q.Set("total", "true")
	q.Set("limit", strconv.Itoa(upstreamLimit))
	q.Set("_", strconv.FormatInt(time.Now().UnixMilli(), 10))
	fallbackURL.RawQuery = q.Encode()
	fallback := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, fallbackURL.String(), nil)
	}, cookie), 0)
	fallbackSongs := neteaseSongsFromResult(fallback)

	seen := map[string]bool{}
	songs := make([]model.CloudSong, 0, len(primarySongs)+len(fallbackSongs))
	for _, s := range append(append([]model.CloudSong{}, primarySongs...), fallbackSongs...) {
		key := ToString(s.ID)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		songs = append(songs, s)
	}
	return songs
}

// NeteaseAccount 获取网易云账号信息（同时校验 cookie）
func NeteaseAccount(ctx context.Context, client *http.Client, cookie string) model.CloudAccount {
	normalized := NormalizeNeteaseCookie(cookie)
	if normalized == "" {
		return model.CloudAccount{Provider: "netease", UserID: nil, Nickname: ""}
	}
	data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, "https://music.163.com/api/nuser/account/get", nil)
	}, normalized), 0)
	profile, _ := data["profile"].(map[string]any)
	account, _ := data["account"].(map[string]any)
	var uid any
	if v, ok := profile["userId"]; ok {
		uid = v
	} else {
		uid = account["id"]
	}
	nickname, _ := profile["nickname"].(string)
	return model.CloudAccount{
		Provider:  "netease",
		Valid:     ToString(uid) != "",
		UserID:    uid,
		Nickname:  nickname,
		HasCookie: normalized != "",
	}
}

// FilterPlayableSongs 分批过滤出可播放歌曲
func FilterPlayableSongs(ctx context.Context, client *http.Client, rawSongs []model.CloudSong, resultLimit int, cookie string) []model.CloudSong {
	playable := make([]model.CloudSong, 0, resultLimit)
	const batchSize = 8
	for i := 0; i < len(rawSongs) && len(playable) < resultLimit; i += batchSize {
		end := i + batchSize
		if end > len(rawSongs) {
			end = len(rawSongs)
		}
		batch := rawSongs[i:end]
		results := make([]model.CloudSong, 0, len(batch))
		for _, s := range batch {
			if GetNeteasePlayableURL(ctx, client, s.ID, cookie, "") != "" {
				results = append(results, s)
				if len(results) >= resultLimit {
					break
				}
			}
		}
		playable = append(playable, results...)
	}
	if len(playable) > resultLimit {
		playable = playable[:resultLimit]
	}
	return playable
}

// NeteaseDaily 每日推荐歌曲
func NeteaseDaily(ctx context.Context, client *http.Client, cookie string, resultLimit int) (valid bool, songs []model.CloudSong) {
	normalized := NormalizeNeteaseCookie(cookie)
	if normalized == "" {
		return false, songs
	}
	if !NeteaseAccount(ctx, client, normalized).Valid {
		return false, songs
	}
	data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, "https://music.163.com/api/v3/discovery/recommend/songs", nil)
	}, normalized), 0)
	var rawSongs []model.CloudSong
	if daily, ok := data["data"].(map[string]any); ok {
		if l, ok := daily["dailySongs"].([]any); ok {
			rawSongs = neteaseSongsFromList(l)
		}
	}
	if len(rawSongs) == 0 {
		if l, ok := data["recommend"].([]any); ok {
			rawSongs = neteaseSongsFromList(l)
		}
	}
	songs = FilterPlayableSongs(ctx, client, rawSongs, resultLimit, normalized)
	return len(rawSongs) > 0, songs
}

// mapNeteasePlaylistSummary 映射网易云歌单摘要
func mapNeteasePlaylistSummary(m map[string]any) model.CloudPlaylistSummary {
	p := model.CloudPlaylistSummary{Provider: "netease", ID: m["id"], Name: toStringKey(m, "name")}
	p.TrackCount = int(ToInt64(m["trackCount"]))
	if c, _ := m["coverImgUrl"].(string); c != "" {
		p.Cover = c
	} else if c, _ := m["picUrl"].(string); c != "" {
		p.Cover = c
	} else if c, _ := m["cover"].(string); c != "" {
		p.Cover = c
	}
	return p
}

// NeteaseUserPlaylists 获取用户歌单
func NeteaseUserPlaylists(ctx context.Context, client *http.Client, cookie string) (valid bool, playlists []model.CloudPlaylistSummary) {
	account := NeteaseAccount(ctx, client, cookie)
	if !account.Valid || ToString(account.UserID) == "" {
		return false, playlists
	}
	for offset := 0; offset < neteaseMaxPlaylists; offset += neteasePlaylistPageLimit {
		u := "https://music.163.com/api/user/playlist?uid=" + url.QueryEscape(ToString(account.UserID)) +
			"&limit=" + strconv.Itoa(neteasePlaylistPageLimit) + "&offset=" + strconv.Itoa(offset)
		cookieData := cookie
		data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
			return http.NewRequest(http.MethodGet, u, nil)
		}, cookieData), 0)
		pageRaw, _ := data["playlist"].([]any)
		var page []model.CloudPlaylistSummary
		for _, raw := range pageRaw {
			if m, ok := raw.(map[string]any); ok {
				page = append(page, mapNeteasePlaylistSummary(m))
			}
		}
		playlists = append(playlists, page...)
		if len(page) < neteasePlaylistPageLimit {
			break
		}
	}
	return true, playlists
}

// readTrackID 从歌曲/trackId 中读取纯数字 id
func readTrackID(item any) string {
	var id string
	switch v := item.(type) {
	case map[string]any:
		id = ToString(v["id"])
	default:
		id = ToString(item)
	}
	num, err := strconv.ParseFloat(id, 64)
	if err != nil || num <= 0 {
		return ""
	}
	return strconv.FormatInt(int64(num), 10)
}

// collectNeteasePlaylistTrackIDs 收集歌单 trackIds（去重，达 limit 停止）
func collectNeteasePlaylistTrackIDs(playlist map[string]any, resultLimit int) []string {
	limit := helperNeteasePlaylistLimit(resultLimit)
	var source []any
	if ids, ok := playlist["trackIds"].([]any); ok && len(ids) > 0 {
		source = ids
	} else if tr, ok := playlist["tracks"].([]any); ok {
		source = tr
	}
	seen := map[string]bool{}
	ids := make([]string, 0, limit)
	for _, item := range source {
		id := readTrackID(item)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		ids = append(ids, id)
		if len(ids) >= limit {
			break
		}
	}
	return ids
}

func helperNeteasePlaylistLimit(resultLimit int) int {
	if resultLimit <= 0 {
		resultLimit = neteaseDefaultPlaylistTracks
	}
	if resultLimit > neteaseMaxPlaylistTracks {
		resultLimit = neteaseMaxPlaylistTracks
	}
	return resultLimit
}

func collectFromSongs(songs []model.CloudSong) []string {
	ids := make([]string, 0, len(songs))
	for _, s := range songs {
		ids = append(ids, ToString(s.ID))
	}
	return ids
}

func mergeNeteasePlaylistTrackDetails(playlistTracks, detailedTracks []model.CloudSong, orderedIDs []string) []model.CloudSong {
	all := append(append([]model.CloudSong{}, playlistTracks...), detailedTracks...)
	byID := map[string]model.CloudSong{}
	for _, t := range all {
		id := ToString(t.ID)
		if id != "" {
			if _, ok := byID[id]; !ok {
				byID[id] = t
			}
		}
	}
	out := make([]model.CloudSong, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		if t, ok := byID[id]; ok {
			out = append(out, t)
		}
	}
	return out
}

// FetchNeteaseSongDetails 批量获取歌曲详情
func FetchNeteaseSongDetails(ctx context.Context, client *http.Client, ids []string, cookie string) []model.CloudSong {
	var tracks []model.CloudSong
	const batchSize = 400
	var nums []int64
	for _, id := range ids {
		if n, err := strconv.ParseInt(id, 10, 64); err == nil {
			nums = append(nums, n)
		}
	}
	for i := 0; i < len(nums); i += batchSize {
		end := i + batchSize
		if end > len(nums) {
			end = len(nums)
		}
		jsonIDs := "["
		for idx, n := range nums[i:end] {
			if idx > 0 {
				jsonIDs += ","
			}
			jsonIDs += strconv.FormatInt(n, 10)
		}
		jsonIDs += "]"
		u := "https://music.163.com/api/song/detail?ids=" + url.QueryEscape(jsonIDs)
		data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
			return http.NewRequest(http.MethodGet, u, nil)
		}, cookie), 2)
		tracks = append(tracks, neteaseSongsFromResult(data)...)
	}
	return tracks
}

// NeteasePlaylist 获取歌单内歌曲
func NeteasePlaylist(ctx context.Context, client *http.Client, playlistID any, cookie string, resultLimit int) (songs []model.CloudSong, totalCount int, rawTrackCount int) {
	requestLimit := helperNeteasePlaylistLimit(resultLimit)
	u := "https://music.163.com/api/v6/playlist/detail?id=" + url.QueryEscape(ToString(playlistID)) +
		"&n=" + strconv.Itoa(requestLimit)
	cookieData := cookie
	data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, u, nil)
	}, cookieData), 0)

	var tracks []model.CloudSong
	var orderedIDs []string
	if playlist, ok := data["playlist"].(map[string]any); ok {
		if tr, ok := playlist["tracks"].([]any); ok {
			tracks = neteaseSongsFromList(tr)
		}
		orderedIDs = collectNeteasePlaylistTrackIDs(playlist, resultLimit)
		if len(orderedIDs) == 0 {
			orderedIDs = collectFromSongs(tracks)
		}
		totalCount = int(ToInt64(playlist["trackCount"]))
	} else {
		orderedIDs = collectFromSongs(tracks)
	}
	if totalCount == 0 {
		totalCount = len(orderedIDs)
	}
	rawTrackCount = len(orderedIDs)

	var detailTracks []model.CloudSong
	if len(orderedIDs) > len(tracks) {
		detailTracks = FetchNeteaseSongDetails(ctx, client, orderedIDs, cookie)
	}
	songs = mergeNeteasePlaylistTrackDetails(tracks, detailTracks, orderedIDs)
	if len(songs) > resultLimit {
		songs = songs[:resultLimit]
	}
	if len(songs) > 0 && totalCount == 0 {
		totalCount = len(orderedIDs)
	}
	return songs, totalCount, rawTrackCount
}

// NeteaseLyric 获取网易云歌词
func NeteaseLyric(ctx context.Context, client *http.Client, id any) (lyric string, translated string) {
	u := "https://music.163.com/api/song/lyric?id=" + url.QueryEscape(ToString(id)) + "&lv=-1&kv=-1&tv=-1"
	data := fetchJSON(ctx, client, buildNeteaseWithHeaders(func() (*http.Request, error) {
		return http.NewRequest(http.MethodGet, u, nil)
	}, ""), 0)
	if lrc, ok := data["lrc"].(map[string]any); ok {
		lyric, _ = lrc["lyric"].(string)
	}
	if tlrc, ok := data["tlyric"].(map[string]any); ok {
		translated, _ = tlrc["lyric"].(string)
	}
	return lyric, translated
}

// --- 扫码登录 ---

// neteaseQRBase 网易云扫码登录接口基址
const neteaseQRBase = "https://music.163.com/api/login/qrcode"

// neteaseQRHeaders 构造扫码接口请求头。
// 扫码接口对请求特征较敏感：默认的 "Mozilla/5.0" 过于简陋，会明显提高被风控的概率
// （上游会返回 8821「需要行为验证码验证」）。这里用完整浏览器 UA 并补齐 Origin/Accept-Language，
// 尽量贴近真实网页登录。注意用 Set 覆盖而不用 Add，避免出现重复的 User-Agent。
func neteaseQRHeaders() http.Header {
	h := CreateNeteaseHeaders("", nil)
	h.Set("Content-Type", "application/x-www-form-urlencoded")
	h.Set(
		"User-Agent",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	)
	h.Set("Origin", "https://music.163.com")
	h.Set("Accept-Language", "zh-CN,zh;q=0.9")
	return h
}

// NeteaseQRKey 申请扫码登录用的 unikey。
// 二维码内容为 https://music.163.com/login?codekey={unikey}，有效期约 5 分钟。
// unikey 为空表示申请失败，此时 code 为上游返回码。
func NeteaseQRKey(ctx context.Context, client *http.Client) (unikey string, code int) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, neteaseQRBase+"/unikey", strings.NewReader("type=1"))
	if err != nil {
		return "", 0
	}
	req.Header = neteaseQRHeaders()
	resp, err := client.Do(req)
	if err != nil {
		return "", 0
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0
	}
	data := map[string]any{}
	_ = json.Unmarshal(body, &data)
	unikey, _ = data["unikey"].(string)
	return unikey, int(ToInt64(data["code"]))
}

// NeteaseQRCheck 轮询扫码状态。
// code 语义：800 二维码已过期 / 801 等待扫码 / 802 已扫码待确认 / 803 授权成功；
// 8821 表示上游要求行为验证码验证（风控拦截，多因出口 IP 请求特征异常或短时间频繁操作），
// 此时应停止轮询，等待风控解除或改用 cookie 登录。
// code 为 803 时会从响应头 Set-Cookie 中提取登录凭证并以 cookie 返回。
func NeteaseQRCheck(ctx context.Context, client *http.Client, key string) (code int, cookie string, message string) {
	key = strings.TrimSpace(key)
	if key == "" {
		return 801, "", ""
	}
	form := url.Values{}
	form.Set("key", key)
	form.Set("type", "1")
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, neteaseQRBase+"/client/login", strings.NewReader(form.Encode()))
	if err != nil {
		return 801, "", ""
	}
	req.Header = neteaseQRHeaders()
	resp, err := client.Do(req)
	if err != nil {
		return 801, "", ""
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 801, "", ""
	}
	data := map[string]any{}
	_ = json.Unmarshal(body, &data)
	code = int(ToInt64(data["code"]))
	message, _ = data["message"].(string)
	if code == 803 {
		cookie = collectNeteaseSetCookies(resp.Header)
	}
	return code, cookie, message
}

// collectNeteaseSetCookies 把响应头中的 Set-Cookie 汇总为可直接复用的 cookie 串。
// 扫码成功时上游会下发 MUSIC_U、__csrf 等多个 cookie，这里取各条的 name=value 并以 "; " 连接，
// 与手动粘贴 cookie 的格式保持一致。
func collectNeteaseSetCookies(header http.Header) string {
	parts := make([]string, 0, 8)
	seen := make(map[string]bool, 8)
	for _, raw := range header.Values("Set-Cookie") {
		pair := raw
		if idx := strings.Index(pair, ";"); idx >= 0 {
			pair = pair[:idx]
		}
		pair = strings.TrimSpace(pair)
		eq := strings.Index(pair, "=")
		if pair == "" || eq <= 0 {
			continue
		}
		name := pair[:eq]
		if seen[name] {
			continue
		}
		seen[name] = true
		parts = append(parts, pair)
	}
	return strings.Join(parts, "; ")
}
