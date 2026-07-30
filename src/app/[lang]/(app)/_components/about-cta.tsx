'use client';

import { siteConfig } from '@/config/common';
import { useT } from '@/i18n/dictionary-provider';
import { Trans } from '@/i18n/Trans';

export function AboutCta() {
  const t = useT();
  return (
    <div className="bg-surface text-surface-foreground flex flex-col gap-2 rounded-lg p-6 text-sm">
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
                className="font-medium underline underline-offset-4"
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
                className="font-medium underline underline-offset-4"
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
