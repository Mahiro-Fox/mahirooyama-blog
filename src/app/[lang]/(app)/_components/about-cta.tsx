import { siteConfig } from '@/config/common';

export function AboutCta() {
  return (
    <div className="bg-surface text-surface-foreground flex flex-col gap-2 rounded-lg p-6 text-sm">
      <div className="text-base leading-tight font-semibold">
        欢迎来到 mahirooyama 的网站喵~
      </div>
      <div className="text-muted-foreground leading-[1.5]">
        本网站主要内容是一些照片，例如和朋友在VRChat里拍的照片。如果想上传照片，可以在{' '}
        <a
          href={siteConfig.links.vrchat}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          VRChat
        </a>{' '}
        联系我哦~
        <br />
        次要内容是一些编程笔记和其他技术分享，后续也可能加入一些新的内容与功能~
        <br />
        源代码在{' '}
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          GitHub
        </a>{' '}
        ，欢迎查看哦~
      </div>
    </div>
  );
}
