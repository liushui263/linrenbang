"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError, useActionForm } from "./ActionForm";
import { clampOffset, cropDrawRect, fitWithin } from "@/lib/image";

const FRAME = 240; // 取景框边长（屏幕像素）
const AVATAR_OUT = 600; // 头像输出边长
const PHOTO_MAX_SIDE = 2000; // 执照等照片长边上限

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

/** 用浏览器自己解码图片（iPhone 的 Safari 能直接打开 HEIC），并按拍照方向摆正 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/**
 * 选图片：在手机上先压缩成 JPEG 再上传（避免原图太大、HEIC 格式被拒）。
 * crop=true 时（头像）给一个圆形取景框，拖动/缩放选好要显示的部分；缩到最小能看到整张图。
 * current：已经上传过的照片地址。会显示出来，并给一个“删除这张”（保存后生效，提交 `${name}_remove=1`）。
 */
export default function ImageUpload({
  name,
  label,
  crop = false,
  current = null,
}: {
  name: string;
  label: string;
  crop?: boolean;
  current?: string | null;
}) {
  const { setFile } = useActionForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  // 保存后照片换了/删了，重新开始
  useEffect(() => setRemove(false), [current]);
  // 裁剪状态：缩放倍数相对“刚好铺满取景框”的比例
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const coverScale = img ? Math.max(FRAME / img.naturalWidth, FRAME / img.naturalHeight) : 1;
  const containScale = img ? Math.min(FRAME / img.naturalWidth, FRAME / img.naturalHeight) : 1;
  const minZoom = containScale / coverScale; // 缩到这里能看到整张图
  const scale = coverScale * zoom;

  useEffect(() => () => {
    if (img) URL.revokeObjectURL(img.src);
  }, [img]);

  function clamp(x: number, y: number, s: number) {
    if (!img) return { x, y };
    return { x: clampOffset(x, img.naturalWidth * s, FRAME), y: clampOffset(y, img.naturalHeight * s, FRAME) };
  }

  // 头像：每次调整后重新生成裁好的图片
  useEffect(() => {
    if (!img || !crop) return;
    const t = setTimeout(async () => {
      const c = document.createElement("canvas");
      c.width = c.height = AVATAR_OUT;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, AVATAR_OUT, AVATAR_OUT);
      const r = cropDrawRect(pos.x, pos.y, scale, img.naturalWidth, img.naturalHeight, FRAME, AVATAR_OUT);
      ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
      setFile(name, await toJpeg(c));
    }, 150);
    return () => clearTimeout(t);
  }, [img, crop, pos, scale, name, setFile]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      const loaded = await loadImage(file);
      if (crop) {
        const s = Math.max(FRAME / loaded.naturalWidth, FRAME / loaded.naturalHeight);
        setZoom(1);
        setPos({ x: (FRAME - loaded.naturalWidth * s) / 2, y: (FRAME - loaded.naturalHeight * s) / 2 });
      } else {
        const { w, h } = fitWithin(loaded.naturalWidth, loaded.naturalHeight, PHOTO_MAX_SIDE);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(loaded, 0, 0, w, h);
        const blob = await toJpeg(c);
        if (!blob) throw new Error("encode");
        setFile(name, blob);
      }
      setImg(loaded);
      setRemove(false);
    } catch {
      setError("这张图片打不开，请换一张，或者截个图再传");
      clear();
    } finally {
      setBusy(false);
      // 不让原文件跟着表单提交（提交的是压缩后的图片）
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setImg(null);
    setFile(name, null);
  }

  function onZoom(z: number) {
    if (!img) return;
    // 以取景框中心为基准缩放
    const ns = coverScale * z;
    const cx = (FRAME / 2 - pos.x) / scale;
    const cy = (FRAME / 2 - pos.y) / scale;
    setZoom(z);
    setPos(clamp(FRAME / 2 - cx * ns, FRAME / 2 - cy * ns, ns));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {current && !img && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt="现在用的照片"
            className={`border ${crop ? "h-20 w-20 rounded-full object-cover" : "h-24 max-w-[10rem] rounded-lg object-contain"} ${
              remove ? "opacity-30 grayscale" : ""
            }`}
          />
          <div className="text-sm">
            {remove ? (
              <>
                <p className="text-red-600">点“保存”后会删除这张</p>
                <button type="button" onClick={() => setRemove(false)} className="mt-1 text-gray-500 underline">
                  不删了
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500">现在用的照片</p>
                <button type="button" onClick={() => setRemove(true)} className="mt-1 text-red-600 underline">
                  删除这张
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {remove && <input type="hidden" name={`${name}_remove`} value="1" />}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-60"
        >
          {busy ? "处理中…" : img || current ? "换一张" : "选择照片"}
        </button>
        {img && (
          <button type="button" onClick={clear} className="text-sm text-gray-500 underline">
            不传了
          </button>
        )}
      </div>
      {/* 没有 name：原图不提交，提交的是处理后的图片 */}
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <FieldError name={name} />

      {img && crop && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">用手指拖动照片、拉动下面的滑块调整，圆圈里的就是头像。往左拉到底能看到整张图。</p>
          <div
            className="relative mx-auto touch-none select-none overflow-hidden rounded-full border-2 border-emerald-500 bg-white"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              setPos(clamp(d.x + e.clientX - d.px, d.y + e.clientY - d.py, scale));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={{
                width: img.naturalWidth * scale,
                height: img.naturalHeight * scale,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            />
          </div>
          <input
            type="range"
            min={Math.min(minZoom, 1)}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label="缩放"
            className="mx-auto block w-60 accent-emerald-600"
          />
        </div>
      )}

      {img && !crop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.src} alt="已选择的照片" className="mt-3 max-h-48 max-w-full rounded-lg border object-contain" />
      )}
    </div>
  );
}
