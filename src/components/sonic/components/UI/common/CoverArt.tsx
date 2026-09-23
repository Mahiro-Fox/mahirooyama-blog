/**
 * 专辑封面缩略图。
 * 有封面地址时渲染图片，否则回退为音符占位图，统一各处封面的边框与圆角样式。
 */
import { ListMusic } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n/i18n';

/**
 * 专辑封面缩略图（无封面时显示占位图标）。
 *
 * @param src 封面图片地址，缺省时显示占位图
 * @param title 曲目名，用于生成 alt 文本
 * @param className 追加的尺寸/布局类名
 * @param iconSize 占位图标尺寸
 */
export function CoverArt({
  src,
  title,
  className = '',
  iconSize = 18,
}: {
  src?: string;
  title: string;
  className?: string;
  iconSize?: number;
}) {
  const _lang2 = useLanguage();
  const baseClass = `shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.04] ${className}`;

  if (src) {
    return (
      <img
        src={src}
        alt={`${title} album cover`}
        className={`${baseClass} object-cover`}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return (
    <div className={`${baseClass} grid place-items-center text-white/35`}>
      <ListMusic size={iconSize} />
    </div>
  );
}
