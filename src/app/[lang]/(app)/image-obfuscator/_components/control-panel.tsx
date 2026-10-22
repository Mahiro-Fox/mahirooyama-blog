"use client";

import {
  BadgeCheck,
  Download,
  Info,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/shadcn-ui/button";
import { Input } from "@/components/shadcn-ui/input";
import { Label } from "@/components/shadcn-ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn-ui/select";
import { Toggle } from "@/components/shadcn-ui/toggle";
import { Spinner } from "@/components/shared/spinner";
import { useT } from "@/i18n/dictionary-provider";
import type { ObfuscationMeta } from "@/lib/image-obfuscator/metadata";
import type {
  ObfuscationMode,
  ObfuscationStage,
} from "@/lib/image-obfuscator/types";
import type { JobStatus } from "../_hooks/use-obfuscation-job";
import type { OutputFormat } from "../_lib/image-codec";

interface ControlPanelProps {
  mode: ObfuscationMode;
  onModeChange: (mode: ObfuscationMode) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  strength: number;
  onStrengthChange: (value: number) => void;
  greenBoost: boolean;
  onGreenBoostChange: (value: boolean) => void;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  quality: number;
  onQualityChange: (value: number) => void;
  status: JobStatus;
  progress: number;
  stage: ObfuscationStage;
  errorMessage: string | null;
  /** 从图片元数据中成功解析出的参数；非空时提示用户直接开始还原 */
  metaNotice?: ObfuscationMeta | null;
  /** 输出体积偏大时的说明（PNG 打乱后不可压缩） */
  sizeNotice?: string | null;
  /** 批量统计 */
  counts: { total: number; done: number; failed: number };
  isDownloading?: boolean;
  canRun: boolean;
  canDownloadAll: boolean;
  onRun: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
  onDownloadAll: () => void;
  onReset: () => void;
}

const STAGE_LABEL_KEYS: Record<ObfuscationStage, string> = {
  "derive-key": "image-obfuscator.stage_derive_key",
  "build-curve": "image-obfuscator.stage_build_curve",
  permute: "image-obfuscator.stage_permute",
  enhance: "image-obfuscator.stage_enhance",
  done: "image-obfuscator.stage_done",
};

export default function ControlPanel({
  mode,
  onModeChange,
  password,
  onPasswordChange,
  strength,
  onStrengthChange,
  greenBoost,
  onGreenBoostChange,
  format,
  onFormatChange,
  quality,
  onQualityChange,
  status,
  progress,
  stage,
  errorMessage,
  metaNotice,
  sizeNotice,
  counts,
  isDownloading = false,
  canRun,
  canDownloadAll,
  onRun,
  onCancel,
  onRetryFailed,
  onDownloadAll,
  onReset,
}: ControlPanelProps) {
  const t = useT();
  const isRunning = status === "running";
  const disabled = isRunning;

  return (
    <div className="border-border bg-card space-y-5 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
        <h2 className="text-base font-semibold">
          {t("image-obfuscator.panel_title")}
        </h2>
      </div>

      {/* 从图片元数据解析出的参数提示 */}
      {metaNotice ? (
        <div className="bg-primary/10 text-primary flex gap-2 rounded-lg px-3 py-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("image-obfuscator.meta_detected")}
            </p>
            <p className="text-xs opacity-80">
              {t("image-obfuscator.meta_detected_hint")}
            </p>
            <p className="font-mono text-xs opacity-80">
              {`${t("image-obfuscator.strength")} ${metaNotice.strength.toFixed(2)} · ${
                metaNotice.format === "png"
                  ? "PNG"
                  : `JPEG ${Math.round(metaNotice.quality * 100)}%`
              } · ${
                metaNotice.enhancement === "green-boost"
                  ? t("image-obfuscator.meta_enhance_on")
                  : t("image-obfuscator.meta_enhance_off")
              }`}
            </p>
          </div>
        </div>
      ) : null}

      {/* 输出体积提示 */}
      {sizeNotice ? (
        <div className="bg-muted text-muted-foreground flex gap-2 rounded-lg px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs leading-relaxed">{sizeNotice}</p>
        </div>
      ) : null}

      {/* 模式切换 */}
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
        <button
          type="button"
          aria-pressed={mode === "obfuscate"}
          disabled={disabled}
          onClick={() => onModeChange("obfuscate")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            mode === "obfuscate"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("image-obfuscator.mode_obfuscate")}
        </button>
        <button
          type="button"
          aria-pressed={mode === "deobfuscate"}
          disabled={disabled}
          onClick={() => onModeChange("deobfuscate")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            mode === "deobfuscate"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("image-obfuscator.mode_deobfuscate")}
        </button>
      </div>

      {/* 密码 */}
      <div className="space-y-1.5">
        <Label htmlFor="obfuscator-password">
          {t("image-obfuscator.password")}
        </Label>
        <Input
          id="obfuscator-password"
          type="password"
          value={password}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={t("image-obfuscator.password_placeholder")}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          {t("image-obfuscator.password_hint")}
        </p>
      </div>

      {/* 强度 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="obfuscator-strength">
            {t("image-obfuscator.strength")}
          </Label>
          <span className="text-muted-foreground font-mono text-xs">
            {strength.toFixed(2)}
          </span>
        </div>
        <input
          id="obfuscator-strength"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={strength}
          disabled={disabled}
          onChange={(event) => onStrengthChange(Number(event.target.value))}
          className="w-full accent-[var(--primary)] disabled:cursor-not-allowed"
        />
        <p className="text-muted-foreground text-xs">
          {strength === 0
            ? t("image-obfuscator.strength_zero_hint")
            : t("image-obfuscator.strength_hint")}
        </p>
      </div>

      {/* 绿图增强 */}
      <div className="space-y-1.5">
        <Toggle
          pressed={greenBoost}
          disabled={disabled}
          onPressedChange={onGreenBoostChange}
          variant="outline"
          className="w-full justify-start px-3"
        >
          {t("image-obfuscator.green_boost")}
        </Toggle>
        <p className="text-muted-foreground text-xs">
          {t("image-obfuscator.green_boost_desc")}
        </p>
      </div>

      {/* 输出格式 */}
      <div className="space-y-1.5">
        <Label>{t("image-obfuscator.output_format")}</Label>
        <Select
          value={format}
          disabled={disabled}
          onValueChange={(value) => onFormatChange(value as OutputFormat)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">
              {t("image-obfuscator.format_png")}
            </SelectItem>
            <SelectItem value="jpeg">
              {t("image-obfuscator.format_jpeg")}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {format === "png"
            ? t("image-obfuscator.format_png_desc")
            : t("image-obfuscator.format_jpeg_desc")}
        </p>
      </div>

      {/* JPG 质量 */}
      {format === "jpeg" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="obfuscator-quality">
              {t("image-obfuscator.quality")}
            </Label>
            <span className="text-muted-foreground font-mono text-xs">
              {Math.round(quality * 100)}%
            </span>
          </div>
          <input
            id="obfuscator-quality"
            type="range"
            min={50}
            max={100}
            step={1}
            value={Math.round(quality * 100)}
            disabled={disabled}
            onChange={(event) =>
              onQualityChange(Number(event.target.value) / 100)
            }
            className="w-full accent-[var(--primary)] disabled:cursor-not-allowed"
          />
        </div>
      ) : null}

      {/* 进度 */}
      {isRunning || counts.total > 0 ? (
        <div className="space-y-1.5">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              {isRunning
                ? t(STAGE_LABEL_KEYS[stage])
                : t("image-obfuscator.stage_done")}
              {counts.total > 0 ? (
                <span className="font-mono">
                  {" · "}
                  {counts.done}/{counts.total}
                </span>
              ) : null}
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-150"
              style={{
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* 错误提示 */}
      {errorMessage ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
        >
          {errorMessage}
        </p>
      ) : null}

      {/* 操作按钮 */}
      <div className="space-y-2">
        <Button
          type="button"
          onClick={onRun}
          disabled={!canRun || isRunning}
          className="w-full"
        >
          {isRunning ? <Spinner /> : <Play className="h-4 w-4" />}
          {isRunning
            ? t("image-obfuscator.processing")
            : mode === "obfuscate"
              ? counts.total > 1
                ? t("image-obfuscator.start_obfuscate_all", {
                    count: counts.total,
                  })
                : t("image-obfuscator.start_obfuscate")
              : counts.total > 1
                ? t("image-obfuscator.start_deobfuscate_all", {
                    count: counts.total,
                  })
                : t("image-obfuscator.start_deobfuscate")}
        </Button>

        {isRunning ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            <X className="h-4 w-4" />
            {t("image-obfuscator.cancel")}
          </Button>
        ) : null}

        {!isRunning && counts.failed > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetryFailed}
            className="w-full"
            disabled={counts.total === 0}
          >
            <RotateCcw className="h-4 w-4" />
            {t("image-obfuscator.retry_failed", { count: counts.failed })}
          </Button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onDownloadAll}
            disabled={!canDownloadAll || isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading
              ? t("image-obfuscator.zipping")
              : t("image-obfuscator.download_all", { count: counts.done })}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onReset}
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4" />
            {t("image-obfuscator.clear_all")}
          </Button>
        </div>
      </div>

      {/* 说明 */}
      <div className="border-border text-muted-foreground space-y-1.5 border-t pt-3 text-xs">
        <p className="flex items-start gap-1.5">
          <span>1.</span>
          <span>{t("image-obfuscator.note_params")}</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span>2.</span>
          <span>{t("image-obfuscator.note_security")}</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span>3.</span>
          <span>{t("image-obfuscator.privacy_notice")}</span>
        </p>
      </div>
    </div>
  );
}
