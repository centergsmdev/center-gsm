"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteProductImage,
  reorderProductImages,
  setPrimaryProductImage,
  uploadProductImages,
  validateProductImages,
  type UploadProgress,
} from "@/lib/admin/product-images";
import type { Tables } from "@/types/database";

type ImageRow = Tables<"product_images">;
type Props = {
  productId?: string;
  images: ImageRow[];
  onImagesChange: (images: ImageRow[]) => void;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
};

export function AdminProductImages({
  productId,
  images,
  onImagesChange,
  pendingFiles,
  onPendingFilesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success" | "warning";
    text: string;
  } | null>(null);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const previews = useMemo(
    () =>
      pendingFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [pendingFiles],
  );
  useEffect(
    () => () => previews.forEach((item) => URL.revokeObjectURL(item.url)),
    [previews],
  );

  const accept = async (incoming: File[]) => {
    const validation = validateProductImages(incoming);
    if (validation.errors.length)
      setMessage({ tone: "error", text: validation.errors.join(" ") });
    else if (validation.warnings.length)
      setMessage({ tone: "warning", text: validation.warnings.join(" ") });
    else setMessage(null);
    if (!validation.valid.length) return;
    if (!productId) {
      onPendingFilesChange([...pendingFiles, ...validation.valid]);
      return;
    }
    setBusy(true);
    const result = await uploadProductImages(
      productId,
      validation.valid,
      images.length,
      (item) =>
        setProgress((current) => ({ ...current, [item.fileName]: item })),
    );
    setBusy(false);
    if (!result.data) {
      setMessage({
        tone: "error",
        text: result.error ?? "Görseller yüklenemedi.",
      });
      return;
    }
    onImagesChange([...images, ...result.data]);
    setMessage({
      tone: "success",
      text: `${result.data.length} görsel başarıyla yüklendi.`,
    });
  };
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    void accept(Array.from(event.target.files ?? []));
    event.target.value = "";
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void accept(Array.from(event.dataTransfer.files));
  };
  const remove = async (image: ImageRow) => {
    if (!window.confirm("Bu görsel kalıcı olarak silinsin mi?")) return;
    setBusy(true);
    const result = await deleteProductImage(image);
    setBusy(false);
    if (!result.data) {
      setMessage({ tone: "error", text: result.error ?? "Görsel silinemedi." });
      return;
    }
    const remaining = images
      .filter((item) => item.id !== image.id)
      .map((item, index) => ({
        ...item,
        sort_order: index,
        is_primary: image.is_primary && index === 0 ? true : item.is_primary,
      }));
    onImagesChange(remaining);
    setMessage({ tone: "success", text: "Görsel silindi." });
  };
  const makePrimary = async (image: ImageRow) => {
    if (!productId || image.is_primary) return;
    setBusy(true);
    const result = await setPrimaryProductImage(productId, image.id);
    setBusy(false);
    if (!result.data) {
      setMessage({
        tone: "error",
        text: result.error ?? "Ana görsel değiştirilemedi.",
      });
      return;
    }
    onImagesChange(
      images.map((item) => ({ ...item, is_primary: item.id === image.id })),
    );
    setMessage({ tone: "success", text: "Ana görsel güncellendi." });
  };
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((item, order) => ({ ...item, sort_order: order }));
    onImagesChange(ordered);
    setBusy(true);
    const result = await reorderProductImages(ordered);
    setBusy(false);
    if (!result.data) {
      onImagesChange(images);
      setMessage({
        tone: "error",
        text: result.error ?? "Sıralama kaydedilemedi.",
      });
    } else
      setMessage({ tone: "success", text: "Görsel sıralaması kaydedildi." });
  };

  return (
    <div className="space-y-5">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={drop}
        className={cn(
          "flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-zinc-50 px-5 text-center transition",
          dragging
            ? "border-red-500 bg-red-50"
            : "border-zinc-200 hover:border-red-300",
        )}
      >
        <UploadCloud className="mb-3 size-8 text-zinc-400" />
        <p className="text-sm font-bold text-zinc-800">
          Görselleri sürükleyip bırakın
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          JPEG, PNG veya WebP · En fazla 5 MB
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus className="size-4" />
          {busy ? "Yükleniyor…" : "Dosya seç"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={pick}
          aria-label="Ürün görselleri seç"
        />
      </div>
      {message ? (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            message.tone === "error"
              ? "bg-red-50 text-red-700"
              : message.tone === "warning"
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-700",
          )}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
      {Object.values(progress).some((item) => item.status === "uploading") ? (
        <div className="space-y-2">
          {Object.values(progress).map((item) => (
            <ProgressRow key={item.fileName} item={item} />
          ))}
        </div>
      ) : null}
      {images.length || previews.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              busy={busy}
              onPrimary={() => void makePrimary(image)}
              onRemove={() => void remove(image)}
              onLeft={() => void move(index, -1)}
              onRight={() => void move(index, 1)}
              leftDisabled={index === 0}
              rightDisabled={index === images.length - 1}
            />
          ))}
          {previews.map(({ file, url }, index) => (
            <PendingTile
              key={`${file.name}-${file.lastModified}`}
              file={file}
              url={url}
              onRemove={() =>
                onPendingFilesChange(
                  pendingFiles.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center text-center">
          <ImagePlus className="mb-2 size-6 text-zinc-300" />
          <p className="text-xs text-zinc-500">
            Henüz ürün görseli yok. Görsel olmayan ürünlerde placeholder
            kullanılacaktır.
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressRow({ item }: { item: UploadProgress }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-zinc-600">
        <span className="truncate">{item.fileName}</span>
        <span>{item.progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full bg-red-600 transition-all"
          style={{ width: `${item.progress}%` }}
        />
      </div>
    </div>
  );
}
function PendingTile({
  file,
  url,
  onRemove,
}: {
  file: File;
  url: string;
  onRemove: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div
        className="aspect-square bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${JSON.stringify(url).slice(1, -1)})` }}
      />
      <div className="border-t border-zinc-100 p-2">
        <p className="truncate text-xs font-semibold">{file.name}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-700">
            Kayıtla yüklenecek
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`${file.name} dosyasını kaldır`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
function ImageTile({
  image,
  busy,
  onPrimary,
  onRemove,
  onLeft,
  onRight,
  leftDisabled,
  rightDisabled,
}: {
  image: ImageRow;
  busy: boolean;
  onPrimary: () => void;
  onRemove: () => void;
  onLeft: () => void;
  onRight: () => void;
  leftDisabled: boolean;
  rightDisabled: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div
        className="aspect-square bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${JSON.stringify(image.url).slice(1, -1)})`,
        }}
      >
        <span className="sr-only">{image.alt_text ?? "Ürün görseli"}</span>
        {image.is_primary ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2 py-1 text-[10px] font-bold text-white">
            <Star className="size-3 fill-current" />
            Ana görsel
          </span>
        ) : null}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <LoaderCircle className="size-5 animate-spin text-red-600" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-100 p-2">
        <div className="flex">
          <TileButton
            label="Görseli sola taşı"
            onClick={onLeft}
            disabled={busy || leftDisabled}
          >
            <ArrowLeft />
          </TileButton>
          <TileButton
            label="Görseli sağa taşı"
            onClick={onRight}
            disabled={busy || rightDisabled}
          >
            <ArrowRight />
          </TileButton>
        </div>
        <div className="flex">
          <TileButton
            label="Ana görsel yap"
            onClick={onPrimary}
            disabled={busy || image.is_primary}
          >
            {image.is_primary ? <Check /> : <Star />}
          </TileButton>
          <TileButton
            label="Görseli sil"
            onClick={onRemove}
            disabled={busy}
            danger
          >
            <Trash2 />
          </TileButton>
        </div>
      </div>
    </div>
  );
}
function TileButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-7 place-items-center rounded-lg text-zinc-500 disabled:opacity-30",
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-zinc-100",
      )}
      aria-label={label}
    >
      {children}
    </button>
  );
}
