import { siteConfig } from '@/config/config';

export function AboutCta() {
  return (
    <div className="bg-surface text-surface-foreground flex flex-col gap-2 rounded-lg p-6 text-sm">
      <div className="text-base leading-tight font-semibold">
        Welcome to the mahirooyama's blog!
      </div>
      <div className="text-muted-foreground">
        It's a my personal blog, and the source code is available on{' '}
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          GitHub
        </a>
        . Feel free to check it out and build your own!
      </div>
    </div>
  );
}
