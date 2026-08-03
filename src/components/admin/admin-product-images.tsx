"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminProductImageEditor,
  drawProductImagePreview,
} from "./admin-product-image-editor";
import { cn } from "@/lib/utils";
import {
  deleteProductImage,
  reorderProductImages,
  setPrimaryProductImage,
  validateProductImages,
  type PendingProductImage,
} from "@/lib/admin/product-images";
import { downloadRemoteImage } from "@/lib/admin/remote-images";
import { DEFAULT_PRODUCT_IMAGE_TRANSFORM } from "@/lib/images/product-image-transform";
import type { Tables } from "@/types/database";

type ImageRow = Tables<"product_images">;
type Props = {
  productId?: string;
  images: ImageRow[];
  onImagesChange: (images: ImageRow[]) => void;
  pendingImages: PendingProductImage[];
  onPendingImagesChange: (images: PendingProductImage[]) => void;
  colorId?: string | null;
};

export function AdminProductImages({
  productId,
  images,
  onImagesChange,
  pendingImages,
  onPendingImagesChange,
  colorId = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success" | "warning";
    text: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const previews = pendingImages;

  const accept = async (incoming: File[]) => {
    const validation = validateProductImages(incoming);
    if (validation.errors.length)
      setMessage({ tone: "error", text: validation.errors.join(" ") });
    else if (validation.warnings.length)
      setMessage({ tone: "warning", text: validation.warnings.join(" ") });
    else setMessage(null);
    if (!validation.valid.length) return;
    onPendingImagesChange([
      ...pendingImages,
      ...validation.valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        transform: { ...DEFAULT_PRODUCT_IMAGE_TRANSFORM },
      })),
    ]);
    setMessage({
      tone: "success",
      text: colorId
        ? `${validation.valid.length} renk görseli hazır. Tuval görünümünü düzenleyip "Varyantları kaydet" butonuna basın.`
        : `${validation.valid.length} görsel eklendi. Tuval görünümünü düzenleyip ürünü kaydedin.`,
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
  const addFromUrl = async () => {
    if (!remoteUrl.trim()) {
      setMessage({ tone: "error", text: "Önce görsel adresini girin." });
      return;
    }
    setRemoteLoading(true);
    setMessage(null);
    const result = await downloadRemoteImage(remoteUrl, "product");
    setRemoteLoading(false);
    if (!result.data) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    await accept([result.data]);
    setRemoteUrl("");
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
    const result = await setPrimaryProductImage(productId, image.id, colorId);
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-bold text-zinc-800">
          Görsel adresinden ekle
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Görsel sitenizin Storage alanına kopyalanır; dış bağlantıya bağımlı
          kalmaz.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label
            className="sr-only"
            htmlFor={`remote-product-image-${colorId ?? "main"}`}
          >
            Görsel adresi
          </label>
          <input
            id={`remote-product-image-${colorId ?? "main"}`}
            type="url"
            inputMode="url"
            value={remoteUrl}
            onChange={(event) => setRemoteUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addFromUrl();
              }
            }}
            placeholder="https://ornek.com/urun-gorseli.jpg"
            className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void addFromUrl()}
            disabled={busy || remoteLoading}
          >
            {remoteLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {remoteLoading ? "Alınıyor…" : "URL'den ekle"}
          </Button>
        </div>
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
          {previews.map(({ id, file, transform }) => (
            <PendingTile
              key={id}
              file={file}
              transform={transform}
              onEdit={() => setEditingId(id)}
              onRemove={() =>
                onPendingImagesChange(
                  pendingImages.filter((image) => image.id !== id),
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
      {editingId ? (
        <AdminProductImageEditor
          key={editingId}
          file={pendingImages.find((image) => image.id === editingId)!.file}
          initialTransform={
            pendingImages.find((image) => image.id === editingId)!.transform
          }
          open
          onClose={() => setEditingId(null)}
          onSave={(transform) => {
            onPendingImagesChange(
              pendingImages.map((image) =>
                image.id === editingId ? { ...image, transform } : image,
              ),
            );
            setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PendingTile({
  file,
  transform,
  onEdit,
  onRemove,
}: {
  file: File;
  transform: PendingProductImage["transform"];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () =>
      drawProductImagePreview(canvasRef.current, image, transform);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, transform]);
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <canvas
        ref={canvasRef}
        width={1200}
        height={1200}
        className="aspect-square w-full bg-white"
        aria-label={`${file.name} düzenlenmiş önizlemesi`}
      />
      <div className="border-t border-zinc-100 p-2">
        <p className="truncate text-xs font-semibold">{file.name}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-amber-700">
            Kayıtla yüklenecek
          </span>
          <div className="flex">
            <button
              type="button"
              onClick={onEdit}
              className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={`${file.name} tuval görünümünü düzenle`}
            >
              <Edit3 className="size-3.5" />
            </button>
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
