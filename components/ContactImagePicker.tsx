"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT_IMAGE_MAX_SIDE, CONTACT_IMAGE_TARGET_BYTES } from "@/lib/anon-recommend";
import { fitWithin } from "@/lib/image";
import { useActionForm } from "./ActionForm";

function encode(canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, q));
}

/**
 * 压缩：长边先缩到 1000px，WebP（不支持就 JPEG），质量从 0.75 往下降，到 100KB 左右为止；
 * 还大就把长边再缩一档。名片、广告截图上的字仍然看得清。
 */
async function compress(img: HTMLImageElement): Promise<Blob | null> {
  let side = CONTACT_IMAGE_MAX_SIDE;
  let best: Blob | null = null;
  for (let round = 0; round < 3; round++) {
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, side);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.75, 0.65, 0.55, 0.45]) {
      let b = await encode(c, "image/webp", q);
      // 老 Safari 不会编码 WebP，会悄悄给 PNG：改用 JPEG
      if (!b || b.type !== "image/webp") b = await encode(c, "image/jpeg", q);
      if (!b) continue;
      if (!best || b.size < best.size) best = b;
      if (b.size <= CONTACT_IMAGE_TARGET_BYTES) return b;
    }
    side = Math.round(side * 0.8);
  }
  return best;
}

/** 联系方式图片：名片、广告截图、二维码。选了就在表单里放 contact_image_set=1，压缩后的图片随表单提交 */
export default function ContactImagePicker({ name = "contact_image" }: { name?: string }) {
  const { setFile } = useActionForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; kb: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    setBusy(true);
    const src = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("decode"));
        i.src = src;
      });
      const blob = await compress(img);
      if (!blob) throw new Error("encode");
      setFile(name, blob);
      setPreview({ url: URL.createObjectURL(blob), kb: Math.max(1, Math.round(blob.size / 1024)) });
    } catch {
      setError("这张图片打不开，请换一张，或者截个图再传");
      clear();
    } finally {
      URL.revokeObjectURL(src);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setFile(name, null);
    setPreview(null);
  }

  return (
    <div>
      {preview && <input type="hidden" name="contact_image_set" value="1" />}
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      {preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt="联系方式图片" className="h-16 w-16 rounded-lg border bg-white object-contain" />
          <div className="min-w-0 flex-1 text-xs text-gray-500">已压缩到 {preview.kb}KB</div>
          <button type="button" onClick={() => inputRef.current?.click()} className="text-sm text-emerald-700 underline">
            换一张
          </button>
          <button type="button" onClick={clear} className="px-1 text-sm text-gray-400" aria-label="删除图片">
            删除
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-gray-300 bg-white py-2.5 text-sm text-gray-600 disabled:opacity-60"
        >
          {busy ? "压缩中…" : "📷 或者传一张图：名片、广告截图、二维码"}
        </button>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
