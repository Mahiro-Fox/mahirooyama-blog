import type { OutputFormat } from './image-codec';

export interface SourceImage {
  file: File;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export interface ResultImage {
  url: string;
  blob: Blob;
  format: OutputFormat;
  width: number;
  height: number;
  mode: 'obfuscate' | 'deobfuscate';
  hadAlpha: boolean;
}
