/**
 * 左侧品牌标记按钮。
 * 固定在画面左缘中部，点击可展开/收起左侧导航；颜色随主题与明暗自动适配。
 */
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { type DisplaySettings } from '../../../lib/settings/displaySettings';

/**
 * 左缘的品牌标记按钮，用于展开/收起左侧导航（受显示设置控制显隐）。
 *
 * @param displaySettings 显示设置，决定是否显示该按钮
 * @param isMobileSideNavOpen 左侧导航当前是否展开
 * @param openMobileSideNav 展开左侧导航
 * @param setIsMobileSideNavOpen 直接设置展开状态
 * @param readableAccent 可读性处理后的强调色
 * @param sideNavActiveColor 导航激活态颜色
 * @param isLightSurface 是否浅色主题，用于阴影与配色微调
 */
export function BrandMark({
  displaySettings,
  isLightSurface,
  isMobileSideNavOpen,
  openMobileSideNav,
  readableAccent,
  setIsMobileSideNavOpen,
  sideNavActiveColor,
}: {
  displaySettings: DisplaySettings;
  isLightSurface: boolean;
  isMobileSideNavOpen: boolean;
  openMobileSideNav: () => void;
  readableAccent: string;
  setIsMobileSideNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sideNavActiveColor: string;
}) {
  const lang = useLanguage();
  return (
    <>
      {/* Brand Mark */}
      {displaySettings.showLeftIcon && (
        <button
          type="button"
          className={`brand-mark pointer-events-auto absolute top-[50%] left-2 z-50 translate-y-[-50%] cursor-pointer transition-opacity hover:opacity-100 ${isMobileSideNavOpen ? 'opacity-0' : 'opacity-40'}`}
          aria-label={
            isMobileSideNavOpen ? t('ui.text.85', lang) : t('ui.text.86', lang)
          }
          aria-expanded={isMobileSideNavOpen}
          onClick={() => {
            if (isMobileSideNavOpen) {
              setIsMobileSideNavOpen(false);
            } else {
              openMobileSideNav();
            }
          }}
          style={{
            color: isMobileSideNavOpen
              ? sideNavActiveColor
              : isLightSurface
                ? readableAccent
                : 'rgba(255, 255, 255, 0.96)',
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}
    </>
  );
}
