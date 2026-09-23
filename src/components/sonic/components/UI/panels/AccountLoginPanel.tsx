/**
 * 账号登录面板。
 * 管理网易云与 QQ 音乐两套登录凭证的填写、保存、清除与有效性状态展示，
 * 并支持桌面端一键登录。
 */
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  neteaseQrCheckAction,
  neteaseQrKeyAction,
} from '@/actions/sonic/cloudmusic-actions';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { colorWithAlpha, primaryGhostStyle } from '../shared/panelShared';

/** 扫码登录所处的阶段 */
type QrPhase =
  | 'idle'
  | 'loading'
  | 'waiting'
  | 'scanned'
  | 'expired'
  | 'success'
  | 'risk'
  | 'error';

/**
 * 二维码缓存（模块级）。
 * 面板卸载重挂（切换标签、开发热更新）时复用同一个未过期的码，
 * 避免重新申请 unikey 导致“手机上扫的码”与“前端轮询的 key”错位（表现为一直返回 801）。
 * 上游 unikey 有效期约 5 分钟，这里取 4 分钟保守复用。
 */
const QR_CACHE_TTL = 4 * 60 * 1000;
let qrCache: { key: string; dataUrl: string; at: number } | null = null;

function clearQrCache() {
  qrCache = null;
}

/**
 * 网易云 / QQ 音乐账号登录与凭证管理面板。
 *
 * @param accentHex 主题强调色
 * @param neteaseCookie 网易云 Cookie 当前值
 * @param qqCookie QQ 音乐 Cookie 当前值
 * @param onSaveCookie 保存网易云 Cookie
 * @param onSaveQQCookie 保存 QQ 音乐 Cookie
 * @param isNeteaseCookieValid 网易云凭证是否有效
 * @param isQQCookieValid QQ 凭证是否有效
 * @param cookieStatus / qqCookieStatus 各自的状态提示文案
 * @param onDesktopNeteaseLogin / onDesktopQQLogin 桌面端一键登录回调
 */
export function AccountLoginPanel({
  accentHex,
  neteaseCookie,
  setNeteaseCookie,
  onSaveCookie,
  onClearCookie,
  cookieStatus,
  isNeteaseCookieValid,
  isSyncingNeteaseCookie,
  qqCookie,
  setQQCookie,
  onSaveQQCookie,
  onClearQQCookie,
  qqCookieStatus,
  isQQCookieValid,
  isSyncingQQCookie,
  desktopLoginStatus,
  onDesktopNeteaseLogin,
  onDesktopQQLogin,
  updateStatus,
  isCheckingUpdate,
  onCheckUpdate,
  onNeteaseLoginSuccess,
}: {
  accentHex: string;
  neteaseCookie: string;
  setNeteaseCookie: (cookie: string) => void;
  onSaveCookie: () => void | Promise<void>;
  onClearCookie: () => void | Promise<void>;
  cookieStatus: string;
  isNeteaseCookieValid: boolean;
  isSyncingNeteaseCookie: boolean;
  qqCookie: string;
  setQQCookie: (cookie: string) => void;
  onSaveQQCookie: () => void | Promise<void>;
  onClearQQCookie: () => void | Promise<void>;
  qqCookieStatus: string;
  isQQCookieValid: boolean;
  isSyncingQQCookie: boolean;
  desktopLoginStatus: string;
  onDesktopNeteaseLogin: () => void | Promise<void>;
  onDesktopQQLogin: () => void | Promise<void>;
  updateStatus: string;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void | Promise<void>;
  /** 扫码登录成功后的回调；参数为后端回传的 cookie，调用方负责保存到本地并刷新账号状态 */
  onNeteaseLoginSuccess?: (cookie: string) => void | Promise<void>;
}) {
  const lang = useLanguage();
  const [provider, setProvider] = useState<'netease' | 'qq'>('netease');
  // key 与图片放在同一个 state 中，确保“轮询的 key”与“屏幕上显示的二维码”永远一致
  const [qr, setQr] = useState<{ key: string; dataUrl: string } | null>(null);
  const [qrPhase, setQrPhase] = useState<QrPhase>('idle');
  // 只接受最后一次申请的结果：StrictMode 下 effect 会双执行，并发申请会造成 key/图片错位
  const qrRequestIdRef = useRef(0);

  // 申请 unikey 并渲染二维码
  const startQrLogin = useCallback(async () => {
    const requestId = ++qrRequestIdRef.current;
    setQrPhase('loading');
    setQr(null);
    clearQrCache();
    const res = await neteaseQrKeyAction();
    if (requestId !== qrRequestIdRef.current) return;
    if (!res.ok || !res.unikey) {
      setQrPhase('error');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(res.qrContent, {
        width: 368,
        margin: 1,
      });
      if (requestId !== qrRequestIdRef.current) return;
      qrCache = { key: res.unikey, dataUrl, at: Date.now() };
      setQr({ key: res.unikey, dataUrl });
      setQrPhase('waiting');
    } catch {
      if (requestId === qrRequestIdRef.current) setQrPhase('error');
    }
  }, []);

  // 切到网易云且尚未登录时开始扫码；优先复用未过期的缓存二维码，
  // 避免面板卸载重挂后重新申请，导致手机上的码与前端轮询的 key 错位
  useEffect(() => {
    if (provider !== 'netease' || isNeteaseCookieValid) return;
    if (qrPhase !== 'idle') return;
    if (qrCache && Date.now() - qrCache.at < QR_CACHE_TTL) {
      setQr({ key: qrCache.key, dataUrl: qrCache.dataUrl });
      setQrPhase('waiting');
      return;
    }
    void startQrLogin();
  }, [provider, isNeteaseCookieValid, qrPhase, startQrLogin]);

  // 用 ref 持有最新回调：父组件每次渲染都会新建该函数，若直接写进依赖会让轮询 effect 反复重建，
  // 定时器不断被清除，轮询几乎无法触发（表现为一直停留在“等待扫码”）
  const loginSuccessRef = useRef(onNeteaseLoginSuccess);
  useEffect(() => {
    loginSuccessRef.current = onNeteaseLoginSuccess;
  }, [onNeteaseLoginSuccess]);

  // 轮询扫码状态：802 已扫码待确认 / 803 授权成功 / 800 二维码过期 / 8821 上游风控
  // 用递归 setTimeout 而非 setInterval：避免慢请求堆积，并能在终态立即停止
  useEffect(() => {
    if (provider !== 'netease') return;
    if (qrPhase !== 'waiting' && qrPhase !== 'scanned') return;
    const key = qr?.key;
    if (!key) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const poll = async () => {
      const res = await neteaseQrCheckAction(key);
      if (cancelled) return;

      // 排查用：浏览器控制台可见每次轮询的状态码
      // （801 待扫码 / 802 已扫待确认 / 803 成功 / 800 过期 / 其他为上游异常）
      console.debug('[netease-qr]', res.code, res.message);

      if (!res.ok) {
        // Server Action 异常（后端不可达等）：连续失败给出提示，避免无声轮询
        failures += 1;
        if (failures >= 5) {
          setQrPhase('error');
          return;
        }
      } else {
        failures = 0;
        if (res.code === 802) {
          setQrPhase('scanned');
        } else if (res.code === 803) {
          setQrPhase('success');
          clearQrCache();
          await loginSuccessRef.current?.(res.cookie);
          return;
        } else if (res.code === 800) {
          setQrPhase('expired');
          clearQrCache();
          return;
        } else if (res.code === 8821) {
          // 8821：上游要求行为验证码验证（风控拦截），继续轮询没有意义，直接提示用户
          setQrPhase('risk');
          clearQrCache();
          return;
        }
      }
      // 间隔放宽到 2.5s：降低请求频率，减少触发上游风控（8821）的概率
      if (!cancelled) timer = setTimeout(poll, 2500);
    };

    timer = setTimeout(poll, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [provider, qrPhase, qr]);

  // 退出登录后重置扫码状态，便于再次扫码
  useEffect(() => {
    if (!isNeteaseCookieValid && qrPhase === 'success') {
      clearQrCache();
      setQrPhase('idle');
    }
  }, [isNeteaseCookieValid, qrPhase]);

  const isDesktop = Boolean(window.sonicDesktop?.isDesktop);
  const activeValid =
    provider === 'netease' ? isNeteaseCookieValid : isQQCookieValid;
  const activeStatus = provider === 'netease' ? cookieStatus : qqCookieStatus;
  const isSyncing =
    provider === 'netease' ? isSyncingNeteaseCookie : isSyncingQQCookie;

  // 扫码状态提示文案（QQ 暂不支持扫码，仍走手动粘贴 Cookie）
  const getHint = (phase: QrPhase) => {
    const map: Record<QrPhase, string> = {
      waiting: t('ui.text.348', lang),
      loading: t('ui.text.347', lang),
      scanned: t('ui.text.349', lang),
      expired: t('ui.text.350', lang),
      success: t('ui.text.351', lang),
      risk: t('ui.text.353', lang),
      error: t('ui.text.352', lang),
      idle: t('ui.text.348', lang),
    };
    return map[phase] || map.idle;
  };

  // 触发风控（8821）时不再展示二维码，改由下方文案说明
  const showQr =
    provider === 'netease' &&
    Boolean(qr?.dataUrl) &&
    !activeValid &&
    qrPhase !== 'risk';

  return (
    <div className="grid gap-5">
      <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="grid grid-cols-2 gap-1">
          {[
            { id: 'netease' as const, label: t('ui.text.309', lang) },
            { id: 'qq' as const, label: t('ui.text.310', lang) },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setProvider(item.id)}
              className={`rounded-[14px] px-4 py-2 text-[12px] font-semibold tracking-[0.08em] transition-colors ${
                provider === item.id
                  ? 'text-white'
                  : 'text-white/42 hover:text-white/70'
              }`}
              style={{
                background:
                  provider === item.id ? `${accentHex}42` : 'transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div
          className="mb-4 rounded-[14px] border p-4"
          style={{
            borderColor: colorWithAlpha(accentHex, 0.16),
            background: `linear-gradient(135deg, ${colorWithAlpha(accentHex, 0.1)}, rgba(255,255,255,0.02))`,
          }}
        >
          <div className="text-[10px] tracking-[0.18em] text-white/45 uppercase">
            Sonic Topography
          </div>
          <div className="mt-2 text-[20px] font-semibold tracking-[0.02em] text-white">
            {t('ui.text.311', lang)}
          </div>
          <div className="mt-2 max-w-[58ch] text-[12px] leading-relaxed text-white/52">
            {t('ui.text.312', lang)}
          </div>
        </div>

        <div className="grid place-items-center py-4">
          <div
            className="relative grid h-[184px] w-[184px] place-items-center overflow-hidden rounded-[20px] border text-center"
            style={{
              borderColor: colorWithAlpha(accentHex, 0.22),
              backgroundColor: colorWithAlpha(accentHex, 0.06),
            }}
          >
            {showQr && qr ? (
              <>
                <img
                  src={qr.dataUrl}
                  alt={t('ui.text.348', lang)}
                  className="h-full w-full bg-white object-contain p-2"
                />
                {qrPhase === 'scanned' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/65 px-4 text-[11px] leading-relaxed text-white/85">
                    {t('ui.text.349', lang)}
                  </div>
                )}
                {qrPhase === 'expired' && (
                  <button
                    type="button"
                    onClick={() => void startQrLogin()}
                    className="absolute inset-0 grid cursor-pointer place-items-center bg-black/70 px-4 text-[11px] leading-relaxed text-white/85"
                  >
                    {t('ui.text.350', lang)}
                  </button>
                )}
              </>
            ) : (
              <div>
                <div
                  className="text-[26px] font-semibold tracking-[0.12em]"
                  style={{ color: accentHex }}
                >
                  {provider === 'netease' ? 'NE' : 'QQ'}
                </div>
                <div className="mt-2 text-[11px] text-white/38">
                  {activeValid
                    ? t('ui.text.313', lang)
                    : qrPhase === 'risk'
                      ? ''
                      : t('ui.text.314', lang)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-[12px] leading-relaxed text-white/55">
          {isSyncing
            ? t('ui.text.315', lang)
            : desktopLoginStatus ||
              activeStatus ||
              (activeValid
                ? t('ui.text.316', lang)
                : provider === 'netease'
                  ? getHint(qrPhase)
                  : `扫码登录${t('ui.text.318', lang)}`)}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={provider === 'netease' ? onClearCookie : onClearQQCookie}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[11px] tracking-[0.08em] text-white/55 hover:text-white"
          >
            {t('ui.text.319', lang)}
          </button>
          <button
            onClick={
              provider === 'netease' ? onDesktopNeteaseLogin : onDesktopQQLogin
            }
            disabled={!isDesktop}
            className="rounded-[10px] border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] disabled:opacity-40"
            style={primaryGhostStyle(accentHex)}
          >
            {isDesktop ? t('ui.text.320', lang) : t('ui.text.321', lang)}
          </button>
        </div>
      </div>

      {!isDesktop && (
        <div
          className="grid gap-3 rounded-[16px] border bg-white/[0.025] p-4"
          style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
        >
          <div className="text-[12px] tracking-[0.18em] text-white/60 uppercase">
            {t('ui.text.322', lang)}
          </div>
          {provider === 'netease' ? (
            <>
              <textarea
                value={neteaseCookie}
                onChange={(e) => setNeteaseCookie(e.target.value)}
                spellCheck={false}
                placeholder="MUSIC_U=...; __csrf=...; NMTID=..."
                className="min-h-[120px] resize-y rounded-[12px] border bg-white/[0.035] px-3 py-3 font-mono text-[12px] leading-relaxed text-white outline-none focus:border-white/30"
                style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
              />
              <button
                onClick={onSaveCookie}
                className="w-fit rounded-[10px] border px-4 py-2 text-[11px]"
                style={primaryGhostStyle(accentHex)}
              >
                {t('ui.text.323', lang)}
              </button>
            </>
          ) : (
            <>
              <textarea
                value={qqCookie}
                onChange={(e) => setQQCookie(e.target.value)}
                spellCheck={false}
                placeholder="uin=...; qm_keyst=...; qqmusic_key=..."
                className="min-h-[120px] resize-y rounded-[12px] border bg-white/[0.035] px-3 py-3 font-mono text-[12px] leading-relaxed text-white outline-none focus:border-white/30"
                style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
              />
              <button
                onClick={onSaveQQCookie}
                className="w-fit rounded-[10px] border px-4 py-2 text-[11px]"
                style={primaryGhostStyle(accentHex)}
              >
                {t('ui.text.324', lang)}
              </button>
            </>
          )}
        </div>
      )}

      <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] tracking-[0.18em] text-white/65 uppercase">
              {t('ui.text.325', lang)}
            </div>
            <div className="mt-1 text-[11px] text-white/40">
              {updateStatus || t('ui.text.326', lang)}
            </div>
          </div>
          <button
            onClick={onCheckUpdate}
            disabled={isCheckingUpdate}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[11px] tracking-[0.08em] text-white/60 hover:text-white disabled:opacity-40"
          >
            {isCheckingUpdate ? t('ui.text.327', lang) : t('ui.text.328', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
