import ImageObfuscatorClient from './image-obfuscator-client';

interface ImageObfuscatorPageProps {
  searchParams: Promise<{ url?: string | string[] }>;
}

export default async function ImageObfuscatorPage({
  searchParams,
}: ImageObfuscatorPageProps) {
  const { url } = await searchParams;
  const initialUrl = Array.isArray(url) ? url[0] : url;

  return <ImageObfuscatorClient initialUrl={initialUrl} />;
}
