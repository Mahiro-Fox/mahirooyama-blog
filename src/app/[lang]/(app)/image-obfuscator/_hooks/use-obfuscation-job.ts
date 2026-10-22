"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EnhancementId,
  ObfuscationMode,
  ObfuscationStage,
  RgbaImage,
} from "@/lib/image-obfuscator/types";
import type {
  ObfuscatorWorkerRequest,
  ObfuscatorWorkerResponse,
} from "@/lib/image-obfuscator/worker-protocol";

export type JobStatus = "idle" | "running" | "done" | "error";

export interface JobFailure extends Error {
  code: string;
}

export interface RunJobInput {
  image: RgbaImage;
  mode: ObfuscationMode;
  password: string;
  strength: number;
  enhancement: EnhancementId;
}

/** 批量队列用：把当前任务的进度同步到对应列表项 */
export interface RunJobCallbacks {
  onProgress?: (stage: ObfuscationStage, ratio: number) => void;
}

interface PendingJob {
  id: number;
  resolve: (image: RgbaImage) => void;
  reject: (error: JobFailure) => void;
}

function createJobFailure(code: string, message: string): JobFailure {
  const error = new Error(message) as JobFailure;
  error.code = code;
  return error;
}

/**
 * 管理一次图片混淆任务：Worker 生命周期、transferable、进度与取消。
 */
export function useObfuscationJob() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingJob | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<ObfuscationStage>("derive-key");
  const [error, setError] = useState<JobFailure | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current = null;
    };
  }, []);

  /**
   * 主线程兜底：Worker 构造失败时仍保证功能可用。
   */
  const runOnMainThread = useCallback(
    async (
      input: RunJobInput,
      callbacks?: RunJobCallbacks,
    ): Promise<RgbaImage> => {
      const { obfuscateImageData, deobfuscateImageData } = await import(
        "@/lib/image-obfuscator"
      );

      const options = {
        password: input.password,
        strength: input.strength,
        enhancement: input.enhancement,
        onProgress: (update: { stage: ObfuscationStage; ratio: number }) => {
          if (!mountedRef.current) return;
          setStage(update.stage);
          setProgress(update.ratio);
          callbacks?.onProgress?.(update.stage, update.ratio);
        },
      };

      const result =
        input.mode === "obfuscate"
          ? await obfuscateImageData(input.image, options)
          : await deobfuscateImageData(input.image, options);

      if (mountedRef.current) {
        setStatus("done");
        setProgress(1);
      }

      return result;
    },
    [],
  );

  const run = useCallback(
    async (
      input: RunJobInput,
      callbacks?: RunJobCallbacks,
    ): Promise<RgbaImage> => {
      setStatus("running");
      setProgress(0);
      setStage("derive-key");
      setError(null);

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      let worker: Worker;
      try {
        worker = new Worker(
          new URL("../_workers/image-obfuscator.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch {
        return runOnMainThread(input, callbacks);
      }

      workerRef.current = worker;

      return new Promise<RgbaImage>((resolve, reject) => {
        pendingRef.current = { id: requestId, resolve, reject };

        const settle = () => {
          pendingRef.current = null;
          worker.terminate();
          if (workerRef.current === worker) {
            workerRef.current = null;
          }
        };

        worker.onmessage = (event: MessageEvent<ObfuscatorWorkerResponse>) => {
          const message = event.data;
          if (message.id !== requestId) return;

          if (message.type === "progress") {
            if (mountedRef.current) {
              setStage(message.stage);
              setProgress(message.ratio);
            }
            callbacks?.onProgress?.(message.stage, message.ratio);
            return;
          }

          if (message.type === "done") {
            settle();
            if (mountedRef.current) {
              setStatus("done");
              setProgress(1);
            }
            resolve({
              width: message.width,
              height: message.height,
              data: new Uint8ClampedArray(message.buffer),
            });
            return;
          }

          settle();
          const failure = createJobFailure(message.code, message.message);
          if (mountedRef.current) {
            setStatus("error");
            setError(failure);
          }
          reject(failure);
        };

        worker.onerror = () => {
          settle();
          const failure = createJobFailure(
            "WORKER_ERROR",
            "Image worker failed",
          );
          if (mountedRef.current) {
            setStatus("error");
            setError(failure);
          }
          reject(failure);
        };

        const request: ObfuscatorWorkerRequest = {
          id: requestId,
          mode: input.mode,
          buffer: input.image.data.buffer as ArrayBuffer,
          width: input.image.width,
          height: input.image.height,
          password: input.password,
          strength: input.strength,
          enhancement: input.enhancement,
        };

        // 使用 transferable 转移像素缓冲区，避免结构化克隆拷贝
        worker.postMessage(request, [request.buffer]);
      });
    },
    [runOnMainThread],
  );

  const cancel = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;

    workerRef.current?.terminate();
    workerRef.current = null;

    if (pending) {
      pending.reject(createJobFailure("ABORTED", "Operation cancelled"));
    }

    if (mountedRef.current) {
      setStatus("idle");
      setProgress(0);
      setError(null);
    }
  }, []);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setStatus("idle");
      setProgress(0);
      setError(null);
    }
  }, []);

  return {
    status,
    progress,
    stage,
    error,
    run,
    cancel,
    reset,
  };
}
