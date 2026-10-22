/**
 * Gilbert（广义 Hilbert）空间填充曲线与沿曲线循环位移。
 *
 * 与 PNGPKG 的思路一致：先为整幅图生成一条覆盖所有像素的哈密顿路径，
 * 再把沿曲线的序列整体循环平移 offset 位。
 * 平移量由密码派生，因此正向/逆向都能用同一条曲线与同一个 offset 精确还原。
 */

/** 低强度时允许的最大单元边长（像素） */
export const MAX_CELL_SIZE = 4;

/**
 * 强度 → 单元边长。
 * 0 表示直通；0–1 之间用粗单元（2–4px）整块搬运；≥1 时逐像素置换。
 */
export function computeCellSize(strength: number): number {
  if (strength <= 0) return 0;
  if (strength >= 1) return 1;
  const raw = Math.round(1 / strength);
  return Math.min(MAX_CELL_SIZE, Math.max(1, raw));
}

/** 曲线走向变体：0 原始、1 转置、2 水平镜像 */
export type CurveVariant = 0 | 1 | 2;

/**
 * 生成覆盖 gridWidth × gridHeight 的 Gilbert 曲线顺序，
 * 返回值为「第 i 个曲线位置对应的行主序下标」。
 */
export function buildCurveOrder(
  gridWidth: number,
  gridHeight: number,
  variant: CurveVariant = 0
): Int32Array {
  const total = gridWidth * gridHeight;
  const order = new Int32Array(total);
  let cursor = 0;

  const emit = (x: number, y: number) => {
    let px = x;
    let py = y;

    if (variant === 1) {
      // 转置：曲线在 H×W 网格上生成，坐标互换回 W×H
      px = y;
      py = x;
    } else if (variant === 2) {
      px = gridWidth - 1 - x;
    }

    order[cursor] = py * gridWidth + px;
    cursor += 1;
  };

  if (variant === 1) {
    if (gridHeight >= gridWidth) {
      generate2d(0, 0, gridHeight, 0, 0, gridWidth, emit);
    } else {
      generate2d(0, 0, 0, gridWidth, gridHeight, 0, emit);
    }
  } else if (gridWidth >= gridHeight) {
    generate2d(0, 0, gridWidth, 0, 0, gridHeight, emit);
  } else {
    generate2d(0, 0, 0, gridHeight, gridWidth, 0, emit);
  }

  return order;
}

/**
 * 用 emit 回调逐点访问曲线：等价于 PNGPKG 的 generate2d 递归。
 */
function generate2d(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  emit: (x: number, y: number) => void
): void {
  const width = Math.abs(ax + ay);
  const height = Math.abs(bx + by);
  const dxA = Math.sign(ax);
  const dyA = Math.sign(ay);
  const dxB = Math.sign(bx);
  const dyB = Math.sign(by);

  if (height === 1) {
    for (let index = 0; index < width; index += 1) {
      emit(x, y);
      x += dxA;
      y += dyA;
    }
    return;
  }

  if (width === 1) {
    for (let index = 0; index < height; index += 1) {
      emit(x, y);
      x += dxB;
      y += dyB;
    }
    return;
  }

  let ax2 = Math.floor(ax / 2);
  let ay2 = Math.floor(ay / 2);
  let bx2 = Math.floor(bx / 2);
  let by2 = Math.floor(by / 2);

  if (2 * width > 3 * height) {
    if (Math.abs(ax2 + ay2) % 2 && width > 2) {
      ax2 += dxA;
      ay2 += dyA;
    }
    generate2d(x, y, ax2, ay2, bx, by, emit);
    generate2d(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by, emit);
    return;
  }

  if (Math.abs(bx2 + by2) % 2 && height > 2) {
    bx2 += dxB;
    by2 += dyB;
  }
  generate2d(x, y, bx2, by2, ax2, ay2, emit);
  generate2d(x + bx2, y + by2, ax, ay, bx - bx2, by - by2, emit);
  generate2d(
    x + (ax - dxA) + (bx2 - dxB),
    y + (ay - dyA) + (by2 - dyB),
    -bx2,
    -by2,
    -(ax - ax2),
    -(ay - ay2),
    emit
  );
}
