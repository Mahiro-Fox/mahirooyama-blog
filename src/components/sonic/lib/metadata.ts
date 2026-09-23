export interface AudioMetadata {
  displayName: string;
  lyrics: string | null;
  cover: string | null;
}

function getFallbackDisplayName(fallbackName: string): string {
  const decodedName = decodeURIComponent(fallbackName);
  return decodedName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Demo Track';
}

function pictureToDataUrl(picture: { data?: Uint8Array; format?: string } | undefined): string | null {
  if (!picture?.data?.length) return null;

  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < picture.data.length; index += chunkSize) {
    binary += String.fromCharCode(...picture.data.subarray(index, index + chunkSize));
  }

  return `data:${picture.format || 'image/jpeg'};base64,${btoa(binary)}`;
}

export async function extractAudioMetadata(blob: Blob, fallbackName: string): Promise<AudioMetadata> {
  const fallbackDisplayName = getFallbackDisplayName(fallbackName);

  try {
    const mm = await import('music-metadata-browser');
    const metadata = await mm.parseBlob(blob);
    const title = metadata.common.title?.trim();
    const artist = metadata.common.artist?.trim();
    const displayName = title ? (artist ? `${artist} - ${title}` : title) : fallbackDisplayName;
    const lyrics = metadata.common.lyrics?.find(Boolean) || null;
    const cover = pictureToDataUrl(metadata.common.picture?.[0]);

    return { displayName, lyrics, cover };
  } catch (error) {
    console.warn('Error reading tags with music-metadata-browser:', error);
  }

  return { displayName: fallbackDisplayName, lyrics: null, cover: null };
}

export async function extractLyricsFromAudio(file: File): Promise<string | null> {
  const metadata = await extractAudioMetadata(file, file.name);
  return metadata.lyrics;
}
