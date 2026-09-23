/**
 * 账号登录面板。
 * 管理网易云与 QQ 音乐两套登录凭证的填写、保存、清除与有效性状态展示，
 * 并支持桌面端一键登录。
 */
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
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
  | 'error';

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
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrKey, setQrKey] = useState('');
  const [qrPhase, setQrPhase] = useState<QrPhase>('idle');

  // 申请 unikey 并渲染二维码；重新申请前清空旧图，避免扫到已失效的码
  const startQrLogin = useCallback(async () => {
    setQrPhase('loading');
    setQrDataUrl('');
    setQrKey('');
    const res = await neteaseQrKeyAction();
    if (!res.ok || !res.unikey) {
      setQrPhase('error');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(res.qrContent, {
        width: 368,
        margin: 1,
      });
      setQrDataUrl(dataUrl);
      setQrKey(res.unikey);
      setQrPhase('waiting');
    } catch {
      setQrPhase('error');
    }
  }, []);

  // 切到网易云且尚未登录时，自动开启一次扫码流程
  useEffect(() => {
    if (provider !== 'netease' || isNeteaseCookieValid) return;
    if (qrPhase !== 'idle') return;
    void startQrLogin();
  }, [provider, isNeteaseCookieValid, qrPhase, startQrLogin]);

  // 轮询扫码状态：802 已扫码待确认 / 803 授权成功 / 800 二维码过期
  useEffect(() => {
    if (provider !== 'netease') return;
    if (qrPhase !== 'waiting' && qrPhase !== 'scanned') return;
    if (!qrKey) return;
    const timer = setInterval(async () => {
      const res = await neteaseQrCheckAction(qrKey);
      if (res.code === 802) {
        setQrPhase('scanned');
      } else if (res.code === 803) {
        setQrPhase('success');
        await onNeteaseLoginSuccess?.(res.cookie);
      } else if (res.code === 800) {
        setQrPhase('expired');
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [provider, qrPhase, qrKey, onNeteaseLoginSuccess]);

  // 退出登录后重置扫码状态，便于再次扫码
  useEffect(() => {
    if (!isNeteaseCookieValid && qrPhase === 'success') setQrPhase('idle');
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
      waiting: t('ui.text.346', lang),
      loading: t('ui.text.347', lang),
      scanned: t('ui.text.349', lang),
      expired: t('ui.text.350', lang),
      success: t('ui.text.351', lang),
      error: t('ui.text.352', lang),
      idle: t('ui.text.348', lang),
    };
    return map[phase] || map.idle;
  };

  const showQr = provider === 'netease' && Boolean(qrDataUrl) && !activeValid;

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
            {showQr ? (
              <>
                <img
                  src={qrDataUrl}
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
