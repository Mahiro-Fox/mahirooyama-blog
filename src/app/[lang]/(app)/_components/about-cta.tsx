'use client';

import { siteConfig } from '@/config/common';
import { useT } from '@/i18n/dictionary-provider';
import { Trans } from '@/i18n/Trans';

export function AboutCta() {
  const t = useT();
  return (
    <div className="bg-surface text-surface-foreground relative flex flex-col gap-2 rounded-lg p-6 text-sm">
      {/* 左侧朱色竖线 */}
      <div className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-[var(--primary)]/60" />
      <div className="text-base leading-tight font-semibold">
        {t('home.title')}
      </div>
      <div className="text-muted-foreground leading-[1.5]">
        <Trans
          i18nKey="home.description_1"
          components={{
            a: (props) => (
              <a
                href={siteConfig.links.vrchat}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4 transition-colors hover:text-[var(--primary)]"
              >
                {props.children}
              </a>
            ),
          }}
        />
        <br />
        {t('home.description_2')}
        <br />
        <Trans
          i18nKey="home.description_3"
          components={{
            a: (props) => (
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4 transition-colors hover:text-[var(--primary)]"
              >
                {props.children}
              </a>
            ),
          }}
        />
      </div>
    </div>
  );
}
