/**
 * 主线程与 Worker 之间的消息协议。
 */
import type { EnhancementId, ObfuscationStage } from './types';

export interface ObfuscatorWorkerRequest {
  id: number;
  mode: 'obfuscate' | 'deobfuscate';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  password: string;
  strength: number;
  salt?: string;
  iterations?: number;
  enhancement?: EnhancementId;
}

export type ObfuscatorWorkerResponse =
  | {
      id: number;
      type: 'progress';
      stage: ObfuscationStage;
      ratio: number;
    }
  | {
      id: number;
      type: 'done';
      buffer: ArrayBuffer;
      width: number;
      height: number;
    }
  | {
      id: number;
      type: 'error';
      code: string;
      message: string;
    };
