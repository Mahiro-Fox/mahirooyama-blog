/**
 * 音质设置面板。
 * 分别选择网易云（码率）与 QQ 音乐（无损/高品/标准等）的播放音质。
 */
import { t, useLanguage } from '../../../lib/i18n/i18n';
import {
  NETEASE_PLAYBACK_BITRATE_OPTIONS,
  QQ_PLAYBACK_QUALITY_OPTIONS,
  type NeteasePlaybackBitrate,
  type PlaybackQualitySettings,
  type QQPlaybackQuality,
} from '../../../lib/settings/playbackQuality';
import { activeControlStyle } from '../shared/panelShared';

/**
 * 播放音质选择面板（网易云码率 / QQ 音质等级）。
 *
 * @param accentHex 主题强调色
 * @param settings 当前音质设置
 * @param onSettingsChange 设置变更回调
 */
export function PlaybackQualityPanel({
  accentHex,
  settings,
  onSettingsChange,
}: {
  accentHex: string;
  settings: PlaybackQualitySettings;
  onSettingsChange: (
    settings:
      | PlaybackQualitySettings
      | ((prev: PlaybackQualitySettings) => PlaybackQualitySettings)
  ) => void;
}) {
  const lang = useLanguage();
  const optionButtonClass =
    'rounded-sm border px-3 py-2 text-[11px] tracking-[0.08em] transition-colors';

  return (
    <div className="grid gap-5">
      <div className="rounded-sm border border-white/10 bg-white/[0.035] p-5">
        <div className="text-[12px] tracking-[0.18em] text-white/65 uppercase">
          QQ Music
        </div>
        <div className="mt-2 text-[11px] leading-relaxed text-white/45">
          {t('ui.text.293', lang)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {QQ_PLAYBACK_QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={optionButtonClass}
              style={
                settings.qqQuality === option.value
                  ? activeControlStyle(accentHex)
                  : {
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)',
                    }
              }
              onClick={() =>
                onSettingsChange((prev) => ({
                  ...prev,
                  qqQuality: option.value as QQPlaybackQuality,
                }))
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-white/[0.035] p-5">
        <div className="text-[12px] tracking-[0.18em] text-white/65 uppercase">
          Netease Cloud Music
        </div>
        <div className="mt-2 text-[11px] leading-relaxed text-white/45">
          {t('ui.text.294', lang)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {NETEASE_PLAYBACK_BITRATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={optionButtonClass}
              style={
                settings.neteaseBitrate === option.value
                  ? activeControlStyle(accentHex)
                  : {
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)',
                    }
              }
              onClick={() =>
                onSettingsChange((prev) => ({
                  ...prev,
                  neteaseBitrate: option.value as NeteasePlaybackBitrate,
                }))
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
