/**
 * 朱线 — 页面区块之间的装饰分割线
 * 渐变淡入的陶土红细线，为页面赋予视觉节奏
 */
export function VermilionThread({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden="true"
    >
      <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent" />
    </div>
  );
}