"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";

type SignatureValue = {
  file: File;
  previewUrl: string;
};

export function SignaturePad({
  onChange,
  error,
}: {
  onChange: (value: SignatureValue | null) => void;
  error?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const pathLength = useRef(0);
  const bounds = useRef({ minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 });
  const [hasInk, setHasInk] = useState(false);
  const [localError, setLocalError] = useState("");

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.75;
    context.strokeStyle = "#18181b";
  }, []);

  useEffect(() => {
    prepareCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      if (!hasInk) prepareCanvas();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [hasInk, prepareCanvas]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = point(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;
    event.preventDefault();
    const next = point(event);
    const previous = lastPoint.current;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    pathLength.current += Math.hypot(next.x - previous.x, next.y - previous.y);
    bounds.current = {
      minX: Math.min(bounds.current.minX, previous.x, next.x),
      minY: Math.min(bounds.current.minY, previous.y, next.y),
      maxX: Math.max(bounds.current.maxX, previous.x, next.x),
      maxY: Math.max(bounds.current.maxY, previous.y, next.y),
    };
    lastPoint.current = next;
    setHasInk(true);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault();
    drawing.current = false;
    lastPoint.current = null;
    const width = bounds.current.maxX - bounds.current.minX;
    const height = bounds.current.maxY - bounds.current.minY;
    if (pathLength.current < 100 || width < 60 || height < 20) {
      setLocalError("İmza çok küçük. Lütfen daha belirgin bir imza atın.");
      onChange(null);
      return;
    }
    setLocalError("");
    const canvas = canvasRef.current;
    canvas?.toBlob((blob) => {
      if (!blob || !canvas) return;
      onChange({
        file: new File([blob], "imza.png", { type: "image/png" }),
        previewUrl: canvas.toDataURL("image/png"),
      });
    }, "image/png");
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    drawing.current = false;
    lastPoint.current = null;
    pathLength.current = 0;
    bounds.current = { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 };
    setHasInk(false);
    setLocalError("");
    onChange(null);
    prepareCanvas();
  }

  const message = error || localError;
  return (
    <div>
      <div
        className={`overflow-hidden rounded-xl border bg-white ${message ? "border-red-500" : "border-zinc-300"}`}
      >
        <canvas
          ref={canvasRef}
          className="block h-56 w-full touch-none bg-[linear-gradient(to_bottom,transparent_88%,#e4e4e7_88%,#e4e4e7_89%,transparent_89%)] sm:h-64"
          aria-label="İmza çizim alanı"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Parmağınızla, kalemle veya mouse ile imzalayabilirsiniz.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="size-4" aria-hidden="true" />
          İmzayı Temizle
        </Button>
      </div>
      {message ? (
        <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
