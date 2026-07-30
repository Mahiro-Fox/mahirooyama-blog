import { ImagePreviewProvider } from '@/context/image-preview-provider';
import { ThemeProvider } from '@/context/theme-provider';
import { Toaster } from '@/components/shadcn-ui/sonner';
import { TailwindIndicator } from '@/components/shared/tailwind-indicator';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/utils/utils';
import '@/styles/globals.css';
import { WebVitals } from '@/components/shared/web-vitals';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'text-foreground overscroll-none font-sans antialiased',
          fontVariables
        )}
      >
        <ThemeProvider>
          <ImagePreviewProvider>
            {children}
            <WebVitals />
            <TailwindIndicator />
            <Toaster position="top-center" />
          </ImagePreviewProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
