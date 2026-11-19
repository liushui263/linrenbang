/** 图片裁剪/缩放的纯计算（客户端组件用，单独拿出来方便测试） */

/** 把图片在取景框里的位置限制住：图比框大时不能露出空白；图比框小时不能拖出框外 */
export function clampOffset(offset: number, imageSize: number, frame: number): number {
  const lo = Math.min(0, frame - imageSize);
  const hi = Math.max(0, frame - imageSize);
  return Math.min(hi, Math.max(lo, offset));
}

/** 长边不超过 maxSide 时的缩放后尺寸（只缩小，不放大） */
export function fitWithin(w: number, h: number, maxSide: number): { w: number; h: number } {
  const k = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * 正方形取景框 frame（屏幕像素）里，图片按 scale 缩放、左上角在 (x, y)。
 * 返回画到 out×out 画布上时，图片应该画的位置和大小（可能部分在画布外，画布会自动裁掉）。
 */
export function cropDrawRect(x: number, y: number, scale: number, imgW: number, imgH: number, frame: number, out: number) {
  const k = out / frame;
  return { dx: x * k, dy: y * k, dw: imgW * scale * k, dh: imgH * scale * k };
}
