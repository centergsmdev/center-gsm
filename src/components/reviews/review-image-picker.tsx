"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import {
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_IMAGE_SIZE,
  REVIEW_IMAGE_TYPES,
} from "@/lib/reviews/images";

export function ReviewImagePicker({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  function select(nextFiles: FileList | null) {
    if (!nextFiles?.length) return;
    const next = [...files, ...Array.from(nextFiles)];
    if (next.length > MAX_REVIEW_IMAGES) {
      setError(`En fazla ${MAX_REVIEW_IMAGES} görsel ekleyebilirsiniz.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const invalidType = next.find(
      (file) => !REVIEW_IMAGE_TYPES.includes(file.type as never),
    );
    if (invalidType) {
      setError("Yalnızca JPEG, PNG veya WebP görsel ekleyebilirsiniz.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const oversized = next.find((file) => file.size > MAX_REVIEW_IMAGE_SIZE);
    if (oversized) {
      setError("Her görsel en fazla 5 MB olabilir.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError("");
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="text-sm font-bold">
        Ürün görselleri{" "}
        <span className="font-normal text-zinc-400">(isteğe bağlı)</span>
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={REVIEW_IMAGE_TYPES.join(",")}
        multiple
        disabled={disabled || files.length >= MAX_REVIEW_IMAGES}
        onChange={(event) => select(event.target.files)}
        className="sr-only"
      />
      <label
        htmlFor={inputId}
        aria-disabled={disabled || files.length >= MAX_REVIEW_IMAGES}
        className="mt-2 flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        <ImagePlus className="size-5 text-emerald-600" />
        <span>
          <span className="block text-sm font-bold text-zinc-800">
            Görsel seç veya buraya dokun
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            En fazla 3 görsel · JPEG, PNG, WebP · görsel başına 5 MB
          </span>
        </span>
      </label>
      {previews.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Seçilen yorum görseli ${index + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/75 text-white shadow-sm hover:bg-red-600"
                aria-label={`${index + 1}. görseli kaldır`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
