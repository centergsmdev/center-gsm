"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

const SESSION_KEY = "center-gsm-promo-video-seen";

export function PromoVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const closeModal = useCallback(() => {
    videoRef.current?.pause();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "true");
      setIsOpen(true);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeModal, isOpen]);

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      setHasStarted(true);
    } catch {
      setHasStarted(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="CENTER GSM reklam videosu"
    >
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-fit max-w-[calc(100vw-1.5rem)] items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black shadow-[0_28px_100px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[calc(100vw-3rem)] sm:rounded-3xl">
        <video
          ref={videoRef}
          className="block h-auto max-h-[calc(100dvh-1.5rem)] w-auto max-w-full object-contain sm:max-h-[calc(100dvh-3rem)]"
          src="/videos/reklam-video.mp4"
          preload="metadata"
          playsInline
          controls={hasStarted}
          onEnded={closeModal}
        >
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>

        {!hasStarted ? (
          <button
            type="button"
            onClick={() => void playVideo()}
            className="absolute inset-0 grid place-items-center bg-black/15 text-white transition hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            aria-label="Reklam videosunu sesli oynat"
          >
            <span className="flex items-center gap-3 rounded-full border border-white/25 bg-black/70 px-6 py-4 text-base font-black shadow-2xl backdrop-blur-md sm:px-8 sm:py-5 sm:text-lg">
              <Play className="size-6 fill-current" aria-hidden="true" />
              Videoyu Oynat
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4"
          aria-label="Reklam videosunu kapat"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
