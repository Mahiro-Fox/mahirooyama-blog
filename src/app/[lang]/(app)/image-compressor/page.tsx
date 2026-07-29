import { Metadata } from 'next';

import ImageCompressorClient from './image-compressor-client';

export const metadata: Metadata = {
  title: '图片压缩转换工具 - image compressor converter tool',
  description:
    '批量压缩、格式转换、调整尺寸，所有处理均在本地完成，保护您的隐私。- multiple image processing, format conversion, size adjustment, privacy protected, local processing, no data leak, no third-party access',
};

export default function ImageCompressorPage() {
  return <ImageCompressorClient />;
}
