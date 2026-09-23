export const QQ_COOKIE_STORAGE_KEY = 'sonic-topography-qq-cookie-v1';
export const QQ_COOKIE_HEADER = 'X-QQ-Music-Cookie';

type CookieMap = Record<string, string>;

function parseCookie(cookie: string | null | undefined): CookieMap {
  const parsed: CookieMap = {};
  String(cookie || '').split(/[;\n\r]+/).forEach((part) => {
    const raw = part.trim();
    if (!raw) return;
    const separator = raw.indexOf('=');
    if (separator <= 0) return;
    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim().replace(/;+$/, '');
    if (key && value) parsed[key] = value;
  });
  return parsed;
}

function serializeCookie(cookie: CookieMap) {
  return Object.entries(cookie)
    .filter(([key, value]) => key && value)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

export function normalizeQQUin(value: string | number | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || digits;
}

export function normalizeQQCookie(value: string | null | undefined) {
  const cookie = parseCookie(value);
  if (Number(cookie.login_type) === 2 && cookie.wxuin && !cookie.uin) cookie.uin = cookie.wxuin;
  if (!cookie.uin && (cookie.qqmusic_uin || cookie.p_uin)) cookie.uin = cookie.qqmusic_uin || cookie.p_uin;
  if (cookie.uin) cookie.uin = normalizeQQUin(cookie.uin);
  return serializeCookie(cookie);
}

export function getQQCookieLoginState(value: string | null | undefined) {
  const cookie = parseCookie(normalizeQQCookie(value));
  const userId = normalizeQQUin(
    Number(cookie.login_type) === 2
      ? (cookie.wxuin || cookie.uin || cookie.p_uin)
      : (cookie.uin || cookie.qqmusic_uin || cookie.wxuin || cookie.p_uin),
  );
  const musicKey = cookie.qm_keyst
    || cookie.qqmusic_key
    || cookie.music_key
    || cookie.p_skey
    || cookie.skey
    || cookie.psrf_qqaccess_token
    || cookie.psrf_qqrefresh_token
    || cookie.wxrefresh_token
    || cookie.wxskey
    || '';
  const playbackKey = cookie.qm_keyst || cookie.qqmusic_key || cookie.music_key || cookie.wxskey || '';

  return {
    loggedIn: Boolean(userId && musicKey),
    userId,
    playbackKeyReady: Boolean(userId && playbackKey),
  };
}

export function createQQCookieHeaders(cookie: string | null | undefined): Record<string, string> {
  const normalized = normalizeQQCookie(cookie);
  return normalized ? { [QQ_COOKIE_HEADER]: normalized } : {};
}

export function readQQCookieStorage() {
  if (typeof window === 'undefined') return '';
  return normalizeQQCookie(window.localStorage.getItem(QQ_COOKIE_STORAGE_KEY));
}

export function writeQQCookieStorage(cookie: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeQQCookie(cookie);
  if (normalized) window.localStorage.setItem(QQ_COOKIE_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(QQ_COOKIE_STORAGE_KEY);
}
