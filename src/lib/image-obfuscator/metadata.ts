/**
 * 图片参数元数据：混淆参数写入 PNG tEXt / JPEG XMP，并提供解析。
 *
 * 只处理字节，不依赖 DOM，可在 Node 测试与浏览器中运行。
 * 密码永远不会写入元数据。
 */
import {
  ALGORITHM_VERSION,
  MAX_STRENGTH,
  MIN_STRENGTH,
  type EnhancementId,
} from './types';

export type MetaOutputFormat = 'png' | 'jpeg';

export interface ObfuscationMeta {
  /** 算法版本，与 ALGORITHM_VERSION 不一致时不予采信 */
  version: number;
  strength: number;
  enhancement: EnhancementId;
  format: MetaOutputFormat;
  quality: number;
}

/** 用于识别本工具写入的元数据 */
export const META_APP_ID = 'mahiro-image-obfuscator';

const PNG_TEXT_KEYWORD = 'MahiroObfuscator';
const XMP_NAMESPACE = 'urn:mahiro:image-obfuscator:1.0';
const XMP_APP1_HEADER = 'http://ns.adobe.com/xap/1.0/\0';
const XMP_PARAMS_PATTERN = /mahiro:params="([^"]*)"/;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeAscii(text: string): Uint8Array {
  return textEncoder.encode(text);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] << 24) >>> 0) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function writeUint32(value: number): Uint8Array {
  const output = new Uint8Array(4);
  output[0] = (value >>> 24) & 0xff;
  output[1] = (value >>> 16) & 0xff;
  output[2] = (value >>> 8) & 0xff;
  output[3] = value & 0xff;
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
}

/** 找到 IEND 块起始位置；找不到时返回 -1。 */
function findPngEnd(bytes: Uint8Array): number {
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    if (readChunkType(bytes, offset + 4) === 'IEND') return offset;
    offset += 12 + length;
  }
  return -1;
}

function buildPngTextChunk(payload: string): Uint8Array {
  const body = concatBytes([
    encodeAscii(`${PNG_TEXT_KEYWORD}\0`),
    encodeAscii(payload),
  ]);
  const typeAndBody = concatBytes([encodeAscii('tEXt'), body]);

  return concatBytes([
    writeUint32(body.length),
    typeAndBody,
    writeUint32(crc32(typeAndBody)),
  ]);
}

function insertPngText(bytes: Uint8Array, payload: string): Uint8Array {
  const endOffset = findPngEnd(bytes);
  if (endOffset < 0) return bytes;

  return concatBytes([
    bytes.subarray(0, endOffset),
    buildPngTextChunk(payload),
    bytes.subarray(endOffset),
  ]);
}

/** 读取本项目写入的 tEXt / iTXt 文本。 */
function readPngText(bytes: Uint8Array): string | null {
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = readChunkType(bytes, offset + 4);
    const dataStart = offset + 8;

    if (type === 'tEXt' || type === 'iTXt') {
      const data = bytes.subarray(dataStart, dataStart + length);
      const keywordEnd = data.indexOf(0);
      if (keywordEnd > 0) {
        const keyword = textDecoder.decode(data.subarray(0, keywordEnd));
        if (keyword === PNG_TEXT_KEYWORD) {
          return textDecoder.decode(data.subarray(keywordEnd + 1));
        }
      }
    }

    if (type === 'IEND') break;
    offset += 12 + length;
  }
  return null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function buildXmpPacket(payload: string): string {
  const escaped = escapeXml(payload);
  return (
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">' +
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    `<rdf:Description rdf:about="" xmlns:mahiro="${XMP_NAMESPACE}" mahiro:params="${escaped}"/>` +
    '</rdf:RDF></x:xmpmeta>' +
    '<?xpacket end="w"?>'
  );
}

function insertJpegXmp(bytes: Uint8Array, payload: string): Uint8Array {
  const body = concatBytes([
    encodeAscii(XMP_APP1_HEADER),
    textEncoder.encode(buildXmpPacket(payload)),
  ]);
  const length = body.length + 2;

  // APP1 段遵循 JPEG 的 16 位长度限制
  if (length > 0xffff) return bytes;

  const segment = concatBytes([
    new Uint8Array([0xff, 0xe1, (length >>> 8) & 0xff, length & 0xff]),
    body,
  ]);

  return concatBytes([bytes.subarray(0, 2), segment, bytes.subarray(2)]);
}

function readJpegXmp(bytes: Uint8Array): string | null {
  const header = encodeAscii(XMP_APP1_HEADER);
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];

    // 无负载的独立标记
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }

    // 进入压缩数据或文件尾后不再寻找
    if (marker === 0xda || marker === 0xd9) break;

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) break;

    const bodyStart = offset + 4;
    const bodyEnd = offset + 2 + length;

    if (marker === 0xe1 && length > header.length) {
      const matches = header.every(
        (value, index) => bytes[bodyStart + index] === value
      );
      if (matches) {
        return textDecoder.decode(
          bytes.subarray(bodyStart + header.length, bodyEnd)
        );
      }
    }

    offset = bodyEnd;
  }

  return null;
}

function buildPayload(meta: ObfuscationMeta): string {
  const payload: Record<string, unknown> = {
    app: META_APP_ID,
    v: meta.version,
    s: meta.strength,
    e: meta.enhancement,
    f: meta.format,
    q: meta.quality,
  };

  return JSON.stringify(payload);
}

function normalizeMeta(value: unknown): ObfuscationMeta | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (record.app !== META_APP_ID) return null;
  if (record.v !== ALGORITHM_VERSION) return null;

  const strength = record.s;
  const quality = record.q;
  const enhancement = record.e;
  const format = record.f;
  const password = record.p;

  if (
    typeof strength !== 'number' ||
    !Number.isFinite(strength) ||
    strength < MIN_STRENGTH ||
    strength > MAX_STRENGTH
  ) {
    return null;
  }

  if (
    typeof quality !== 'number' ||
    !Number.isFinite(quality) ||
    quality < 0 ||
    quality > 1
  ) {
    return null;
  }

  if (enhancement !== 'none' && enhancement !== 'green-boost') return null;
  if (format !== 'png' && format !== 'jpeg') return null;
  if (password !== undefined && typeof password !== 'string') return null;

  return {
    version: ALGORITHM_VERSION,
    strength,
    enhancement,
    format,
    quality,
  };
}

function parsePayload(payload: string): ObfuscationMeta | null {
  try {
    return normalizeMeta(JSON.parse(payload));
  } catch {
    return null;
  }
}

/**
 * 把参数写入图片字节：PNG 用 tEXt 块，JPEG 用 XMP APP1 段。
 * 不支持的容器原样返回。
 */
export function embedObfuscationMeta(
  bytes: Uint8Array,
  meta: ObfuscationMeta
): Uint8Array {
  const payload = buildPayload(meta);

  if (isPng(bytes)) return insertPngText(bytes, payload);
  if (isJpeg(bytes)) return insertJpegXmp(bytes, payload);
  return bytes;
}

/**
 * 从图片字节读取参数；没有写入过、格式不识别或字段非法时返回 null。
 */
export function readObfuscationMeta(bytes: Uint8Array): ObfuscationMeta | null {
  let payload: string | null = null;

  if (isPng(bytes)) {
    payload = readPngText(bytes);
  } else if (isJpeg(bytes)) {
    const xmp = readJpegXmp(bytes);
    const match = xmp ? XMP_PARAMS_PATTERN.exec(xmp) : null;
    payload = match ? unescapeXml(match[1]) : null;
  }

  return payload ? parsePayload(payload) : null;
}
