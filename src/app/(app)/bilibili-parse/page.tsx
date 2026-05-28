import { Metadata } from 'next';

import Client from './bilibili-parse-client';

export const metadata: Metadata = {
  title: 'Bilibili视频解析 - bilibili video parser',
  description:
    '输入Bilibili视频链接，获取带声音的 MP4 直链 - input bilibili video url, get mp4 direct link with sound',
  keywords: [
    'b站',
    'bilibili',
    'video',
    'parser',
    'mp4',
    'direct link',
    'bilibili video parser',
  ],
};
export default function BilibiliParsePage() {
  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">
            Bilibili视频解析
          </h1>
          <p className="text-muted-foreground">
            输入Bilibili视频链接，获取带声音的MP4直链，
            <strong className="text-destructive">
              不支持下载版权、付费或会员受限内容
            </strong>
          </p>
        </div>
        <Client />
      </div>
    </div>
  );
}
