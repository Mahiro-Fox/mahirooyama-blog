/**
 * 图片混淆 Worker：只做像素运算，不接触 DOM。
 */
import {
  deobfuscateImageData,
  obfuscateImageData,
} from '@/lib/image-obfuscator';
import { isObfuscationError } from '@/lib/image-obfuscator/types';
import type { ObfuscationProgress } from '@/lib/image-obfuscator/types';
import type {
  ObfuscatorWorkerRequest,
  ObfuscatorWorkerResponse,
} from '@/lib/image-obfuscator/worker-protocol';

const context = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ObfuscatorWorkerRequest>) => void) | null;
  postMessage: (
    message: ObfuscatorWorkerResponse,
    transfer?: Transferable[]
  ) => void;
};

function post(
  message: ObfuscatorWorkerResponse,
  transfer?: Transferable[]
): void {
  context.postMessage(message, transfer);
}

context.onmessage = async (event: MessageEvent<ObfuscatorWorkerRequest>) => {
  const request = event.data;

  try {
    const image = {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.buffer),
    };

    const options = {
      password: request.password,
      strength: request.strength,
      salt: request.salt,
      iterations: request.iterations,
      enhancement: request.enhancement,
      onProgress: (progress: ObfuscationProgress) => {
        post({
          id: request.id,
          type: 'progress',
          stage: progress.stage,
          ratio: progress.ratio,
        });
      },
    };

    const result =
      request.mode === 'obfuscate'
        ? await obfuscateImageData(image, options)
        : await deobfuscateImageData(image, options);

    const buffer = result.data.buffer as ArrayBuffer;

    post(
      {
        id: request.id,
        type: 'done',
        buffer,
        width: result.width,
        height: result.height,
      },
      [buffer]
    );
  } catch (error) {
    post({
      id: request.id,
      type: 'error',
      code: isObfuscationError(error) ? error.code : 'INTERNAL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
