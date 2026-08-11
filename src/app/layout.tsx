import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { ImagePreviewProvider } from '@/context/image-preview-provider';
import { Toaster } from '@/components/shadcn-ui/sonner';
import { TailwindIndicator } from '@/components/shared/tailwind-indicator';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/utils/utils';
import '@/styles/globals.css';
import '@/styles/theme.css';
import { WebVitals } from '@/components/shared/web-vitals';
import { defaultTheme, THEME_STORAGE_KEY, themes } from '@/config/themes';

interface RootLayoutProps {
  children: React.ReactNode;
}

// 防 FOUC 内联脚本：在 HTML 解析阶段同步读取 localStorage 并设置 data-theme，
// 避免页面加载时先闪一下默认主题再切换的视觉跳动。
// 脚本必须同步执行且尽可能靠前，放在 <head> 内。
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var validThemes = ${JSON.stringify(themes.map((t) => t.id))};
    if (stored && validThemes.indexOf(stored) !== -1) {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      document.documentElement.setAttribute('data-theme', '${defaultTheme}');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${defaultTheme}');
  }
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={cn(
          'text-foreground overscroll-none font-sans antialiased',
          fontVariables
        )}
      >
        {/* 尊重 prefers-reduced-motion：动画降级为静态/局部透明过渡（WCAG 2.3.3） */}
        {/* LazyMotion + m.*：按需加载动画特性，避免打包完整 motion 的 ~30kb（use-lazy-motion） */}
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domAnimation}>
            <ImagePreviewProvider>
              {children}
              <WebVitals />
              <TailwindIndicator />
              <Toaster position="top-center" />
            </ImagePreviewProvider>
          </LazyMotion>
        </MotionConfig>
      </body>
    </html>
  );
}
