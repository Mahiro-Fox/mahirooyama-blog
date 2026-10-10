/**
 * 曲目标题跑马灯。
 * 当标题超出面板宽度时循环滚动展示，并保留一份屏幕阅读器可读的完整标题。
 */
import { useLanguage } from '../../../lib/i18n/i18n';

/**
 * 曲目标题跑马灯（超长标题循环滚动，同时提供无障碍文本）。
 *
 * @param title 完整标题文本
 */
export function MarqueeTitle({ title }: { title: string }) {
  const _lang = useLanguage();
  return (
    <div className="player-panel-title-marquee" title={title}>
      <div className="player-panel-title-track" aria-hidden="true">
        <span>{title}</span>
        <span>{title}</span>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
