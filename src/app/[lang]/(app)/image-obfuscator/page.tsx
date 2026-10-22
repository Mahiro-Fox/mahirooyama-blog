import ImageObfuscatorClient from "./image-obfuscator-client";

interface ImageObfuscatorPageProps {
  searchParams: Promise<{ url?: string | string[] }>;
}

export default async function ImageObfuscatorPage({
  searchParams,
}: ImageObfuscatorPageProps) {
  const { url } = await searchParams;
  const initialUrls = (Array.isArray(url) ? url : url ? [url] : []).filter(
    Boolean,
  );

  return <ImageObfuscatorClient initialUrls={initialUrls} />;
}
