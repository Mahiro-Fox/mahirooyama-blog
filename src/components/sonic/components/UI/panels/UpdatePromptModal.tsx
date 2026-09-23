/**
 * 更新提示弹窗。
 * 展示新版本信息与下载进度，提供下载、前往发布页、稍后提醒与跳过该版本等操作。
 */
import { X } from 'lucide-react';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import type { AvailableUpdateInfo, UpdateDownloadJob } from '../../../types';
import { formatBytes } from '../hooks/useUpdateController';
import {
  colorWithAlpha,
  primaryGhostStyle,
  themedPanelStyle,
} from '../shared/panelShared';

function formatUpdatePublishedAt(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

/**
 * 应用更新提示弹窗（含下载进度展示）。
 *
 * @param accentHex 主题强调色
 * @param update 可用更新信息（版本号、说明等）
 * @param updateStatus 当前更新状态文案
 * @param downloadJob 下载任务进度，未下载时为 null
 * @param onDownload 开始下载更新
 * @param showReleaseFallback 是否显示前往发布页的兜底入口
 * @param onRemindLater 稍后提醒
 * @param onSkipVersion 跳过该版本
 */
export function UpdatePromptModal({
  accentHex,
  update,
  updateStatus,
  downloadJob,
  onDownload,
  showReleaseFallback,
  onOpenRelease,
  onRemindLater,
  onSkipVersion,
}: {
  accentHex: string;
  update: AvailableUpdateInfo;
  updateStatus: string;
  downloadJob: UpdateDownloadJob | null;
  onDownload: () => void | Promise<void>;
  showReleaseFallback: boolean;
  onOpenRelease: () => void | Promise<void>;
  onRemindLater: () => void;
  onSkipVersion: () => void;
}) {
  const lang = useLanguage();
  const isDownloading =
    downloadJob?.status === 'queued' || downloadJob?.status === 'downloading';
  const total = Number(downloadJob?.total || 0);
  const progress = downloadJob
    ? total > 0
      ? `${formatBytes(downloadJob.received)} / ${formatBytes(total)}`
      : `已下载 ${formatBytes(downloadJob.received)}`
    : '';
  const notes = update.release?.notes?.trim() || t('ui.text.295', lang);
  const publishedAt = formatUpdatePublishedAt(update.release?.publishedAt);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[140] flex items-center justify-center px-4 backdrop-blur-md"
      style={{ background: 'rgba(0,0,0,0.42)' }}
    >
      <div
        className="max-h-[84vh] w-[560px] max-w-[94vw] overflow-hidden rounded-[18px] border shadow-[0_32px_90px_rgba(0,0,0,0.45)]"
        style={themedPanelStyle(accentHex, 0.92)}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
        >
          <div>
            <div className="text-[10px] tracking-[0.22em] text-white/45 uppercase">
              Application Update
            </div>
            <div className="mt-2 text-[22px] font-semibold tracking-[0.02em] text-white">
              {t('ui.text.296', lang)}
            </div>
            <div className="mt-1 text-[12px] text-white/48">
              {t('ui.text.297', lang)}
              {update.currentVersion || '-'} {'->'} {t('ui.text.298', lang)}
              {update.latestVersion || '-'}
            </div>
          </div>
          <button
            onClick={onRemindLater}
            disabled={isDownloading}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/45 hover:text-white disabled:opacity-40"
            title={t('ui.text.299', lang)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="themed-scrollbar grid max-h-[54vh] gap-4 overflow-y-auto px-5 py-4">
          <div
            className="rounded-[14px] border bg-white/[0.025] px-4 py-3"
            style={{ borderColor: colorWithAlpha(accentHex, 0.14) }}
          >
            <div className="text-[13px] font-semibold text-white/85">
              {update.release?.name ||
                `Sonic Topography ${update.latestVersion || ''}`}
            </div>
            {publishedAt && (
              <div className="mt-1 text-[11px] text-white/38">
                {t('ui.text.300', lang)}
                {publishedAt}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] tracking-[0.16em] text-white/50 uppercase">
              {t('ui.text.301', lang)}
            </div>
            <div
              className="max-h-[240px] overflow-y-auto rounded-[14px] border bg-black/20 px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap text-white/68"
              style={{ borderColor: colorWithAlpha(accentHex, 0.14) }}
            >
              {notes}
            </div>
          </div>

          {(updateStatus || downloadJob) && (
            <div
              className="rounded-[14px] border bg-white/[0.025] px-4 py-3 text-[12px] leading-relaxed text-white/58"
              style={{ borderColor: colorWithAlpha(accentHex, 0.14) }}
            >
              <div>{updateStatus || t('ui.text.302', lang)}</div>
              {downloadJob?.channelName && (
                <div className="mt-1 text-white/42">
                  {t('ui.text.303', lang)}
                  {downloadJob.channelName}
                </div>
              )}
              {downloadJob && (
                <div className="mt-1 text-white/42">
                  {t('ui.text.304', lang)}
                  {progress}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="flex flex-wrap justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
        >
          {showReleaseFallback && (
            <button
              onClick={onOpenRelease}
              className="rounded-[10px] border border-white/10 px-4 py-2 text-[11px] tracking-[0.08em] text-white/70 hover:text-white"
            >
              {t('ui.text.345', lang)}
            </button>
          )}
          <button
            onClick={onSkipVersion}
            disabled={isDownloading}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[11px] tracking-[0.08em] text-white/50 hover:text-white disabled:opacity-40"
          >
            {t('ui.text.305', lang)}
          </button>
          <button
            onClick={onRemindLater}
            disabled={isDownloading}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[11px] tracking-[0.08em] text-white/60 hover:text-white disabled:opacity-40"
          >
            {t('ui.text.306', lang)}
          </button>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="rounded-[10px] border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] disabled:opacity-40"
            style={primaryGhostStyle(accentHex)}
          >
            {isDownloading ? t('ui.text.307', lang) : t('ui.text.308', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
