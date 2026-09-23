export const NETEASE_COOKIE_STORAGE_KEY = 'sonic-topography-netease-cookie-v1';
export const NETEASE_COOKIE_HEADER = 'X-Netease-Cookie';

export function normalizeNeteaseCookie(value: string | null | undefined) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/;+$/, ''))
    .filter(Boolean)
    .join('; ');
}

export function createNeteaseCookieHeaders(cookie: string | null | undefined): Record<string, string> {
  const normalized = normalizeNeteaseCookie(cookie);
  return normalized ? { [NETEASE_COOKIE_HEADER]: normalized } : {};
}

export function readNeteaseCookieStorage() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(NETEASE_COOKIE_STORAGE_KEY) || '';
}

export function writeNeteaseCookieStorage(cookie: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeNeteaseCookie(cookie);
  if (normalized) {
    window.localStorage.setItem(NETEASE_COOKIE_STORAGE_KEY, normalized);
  } else {
    window.localStorage.removeItem(NETEASE_COOKIE_STORAGE_KEY);
  }
}
