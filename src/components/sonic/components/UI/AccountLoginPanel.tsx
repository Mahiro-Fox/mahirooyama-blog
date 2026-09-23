import { useState } from 'react';
import { t, useLanguage } from '../../lib/i18n';
import { colorWithAlpha, primaryGhostStyle } from './panelShared';

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
}) {
  const lang = useLanguage();
  const [provider, setProvider] = useState<'netease' | 'qq'>('netease');
  const isDesktop = Boolean(window.sonicDesktop?.isDesktop);
  const activeValid =
    provider === 'netease' ? isNeteaseCookieValid : isQQCookieValid;
  const activeStatus = provider === 'netease' ? cookieStatus : qqCookieStatus;
  const isSyncing =
    provider === 'netease' ? isSyncingNeteaseCookie : isSyncingQQCookie;

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
            className="grid h-[184px] w-[184px] place-items-center rounded-[20px] border text-center"
            style={{
              borderColor: colorWithAlpha(accentHex, 0.22),
              backgroundColor: colorWithAlpha(accentHex, 0.06),
            }}
          >
            <div>
              <div
                className="text-[26px] font-semibold tracking-[0.12em]"
                style={{ color: accentHex }}
              >
                {provider === 'netease' ? 'NE' : 'QQ'}
              </div>
              <div className="mt-2 text-[11px] text-white/38">
                {activeValid ? t('ui.text.313', lang) : t('ui.text.314', lang)}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[12px] leading-relaxed text-white/55">
          {isSyncing
            ? t('ui.text.315', lang)
            : desktopLoginStatus ||
              activeStatus ||
              (activeValid
                ? t('ui.text.316', lang)
                : `扫码登录${provider === 'netease' ? t('ui.text.317', lang) : t('ui.text.318', lang)}`)}
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