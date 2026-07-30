"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { AdminModal } from "@/components/admin/admin-modal-lazy";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_IMAGE_CANVAS_SIZE,
  PRODUCT_IMAGE_SAFE_SIZE,
  type ProductImageTransform,
} from "@/lib/images/product-image-transform";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function AdminProductImageEditor({
  file,
  initialTransform,
  open,
  onClose,
  onSave,
}: {
  file: File;
  initialTransform: ProductImageTransform;
  open: boolean;
  onClose: () => void;
  onSave: (transform: ProductImageTransform) => void;
}) {
  const [transform, setTransform] = useState(initialTransform);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setTransform(initialTransform), [file, initialTransform]);
  useEffect(() => {
    if (!open) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawProductImagePreview(canvasRef.current, image, initialTransform);
    };
    image.src = url;
    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
    };
  }, [file, initialTransform, open]);
  useEffect(() => {
    if (imageRef.current)
      drawProductImagePreview(canvasRef.current, imageRef.current, transform);
  }, [transform]);

  const move = (axis: "x" | "y", amount: number) =>
    setTransform((current) => ({
      ...current,
      [axis === "x" ? "offsetX" : "offsetY"]: clamp(
        current[axis === "x" ? "offsetX" : "offsetY"] + amount,
        -1,
        1,
      ),
    }));
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragRef.current.x) / rect.width) * 2;
    const deltaY = ((event.clientY - dragRef.current.y) / rect.height) * 2;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setTransform((current) => ({
      ...current,
      offsetX: clamp(current.offsetX + deltaX, -1, 1),
      offsetY: clamp(current.offsetY + deltaY, -1, 1),
    }));
  };

  return (
    <AdminModal
      open={open}
      wide
      onClose={onClose}
      title="1200 × 1200 ürün görseli"
      description="Ürünün tuval içindeki boyutunu ve konumunu belirleyin. Görsel oranı korunur."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button onClick={() => onSave(transform)}>Görünümü Uygula</Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
        <canvas
          ref={canvasRef}
          width={PRODUCT_IMAGE_CANVAS_SIZE}
          height={PRODUCT_IMAGE_CANVAS_SIZE}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={pointerMove}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          className="aspect-square w-full cursor-move touch-none rounded-xl border border-zinc-200 bg-white shadow-inner"
          aria-label="1200 × 1200 ürün görseli önizlemesi"
        />
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-700">
              <span>Ürün boyutu</span>
              <span>%{Math.round(transform.zoom * 100)}</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.1"
              step="0.01"
              value={transform.zoom}
              onChange={(event) =>
                setTransform((current) => ({
                  ...current,
                  zoom: Number(event.target.value),
                }))
              }
              className="w-full accent-red-600"
              aria-label="Ürün görseli boyutu"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ControlButton
                label="Küçült"
                onClick={() =>
                  setTransform((current) => ({
                    ...current,
                    zoom: clamp(current.zoom - 0.05, 0.4, 1.1),
                  }))
                }
              >
                <ZoomOut />
              </ControlButton>
              <ControlButton
                label="Büyüt"
                onClick={() =>
                  setTransform((current) => ({
                    ...current,
                    zoom: clamp(current.zoom + 0.05, 0.4, 1.1),
                  }))
                }
              >
                <ZoomIn />
              </ControlButton>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-zinc-700">Konum</p>
            <div className="grid grid-cols-3 gap-2">
              <span />
              <ControlButton
                label="Yukarı taşı"
                onClick={() => move("y", -0.08)}
              >
                <ArrowUp />
              </ControlButton>
              <span />
              <ControlButton label="Sola taşı" onClick={() => move("x", -0.08)}>
                <ArrowLeft />
              </ControlButton>
              <ControlButton
                label="Ortala"
                onClick={() =>
                  setTransform((current) => ({
                    ...current,
                    offsetX: 0,
                    offsetY: 0,
                  }))
                }
              >
                <RotateCcw />
              </ControlButton>
              <ControlButton label="Sağa taşı" onClick={() => move("x", 0.08)}>
                <ArrowRight />
              </ControlButton>
              <span />
              <ControlButton label="Aşağı taşı" onClick={() => move("y", 0.08)}>
                <ArrowDown />
              </ControlButton>
            </div>
          </div>
          <p className="rounded-xl bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-500">
            Önizleme ve sunucuda oluşturulan WebP aynı 1200 × 1200 yerleşim
            hesaplamasını kullanır.
          </p>
        </div>
      </div>
    </AdminModal>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function drawProductImagePreview(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement,
  transform: ProductImageTransform,
) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, PRODUCT_IMAGE_CANVAS_SIZE, PRODUCT_IMAGE_CANVAS_SIZE);
  const fit = Math.min(
    PRODUCT_IMAGE_SAFE_SIZE / image.naturalWidth,
    PRODUCT_IMAGE_SAFE_SIZE / image.naturalHeight,
  );
  const width = Math.min(
    PRODUCT_IMAGE_CANVAS_SIZE,
    image.naturalWidth * fit * transform.zoom,
  );
  const height = Math.min(
    PRODUCT_IMAGE_CANVAS_SIZE,
    image.naturalHeight * fit * transform.zoom,
  );
  const availableX = PRODUCT_IMAGE_CANVAS_SIZE - width;
  const availableY = PRODUCT_IMAGE_CANVAS_SIZE - height;
  const x = (availableX / 2) * (1 + transform.offsetX);
  const y = (availableY / 2) * (1 + transform.offsetY);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, width, height);
}
