"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { SafeAudioContextState } from "@/lib/live-chat/video-call";

type AvatarProps = {
  displayName: string;
  imageUrl: string | null;
  stream: MediaStream | null;
  mode: "static" | "audio-reactive";
  audioActivated: boolean;
  onAudioContextStateChange?: (state: SafeAudioContextState) => void;
};

export function VideoAvatar(props: AvatarProps) {
  return props.mode === "audio-reactive" ? (
    <AudioReactiveAvatarRenderer {...props} />
  ) : (
    <StaticAvatarRenderer {...props} />
  );
}

export function StaticAvatarRenderer({ displayName, imageUrl }: AvatarProps) {
  return (
    <AvatarFrame displayName={displayName} imageUrl={imageUrl} mouth="closed" />
  );
}

export function AudioReactiveAvatarRenderer({
  displayName,
  imageUrl,
  stream,
  audioActivated,
  onAudioContextStateChange,
}: AvatarProps) {
  const [mouth, setMouth] = useState<"closed" | "small" | "medium" | "open">(
    "closed",
  );
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    contextRef.current = context;
    const reportContextState = () => onAudioContextStateChange?.(context.state);
    context.addEventListener("statechange", reportContextState);
    reportContextState();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    const samples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    let frame = 0;
    const update = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / samples.length);
      setMouth(
        rms > 0.16
          ? "open"
          : rms > 0.09
            ? "medium"
            : rms > 0.035
              ? "small"
              : "closed",
      );
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      context.removeEventListener("statechange", reportContextState);
      void context.close();
      contextRef.current = null;
      onAudioContextStateChange?.("inactive");
      setMouth("closed");
    };
  }, [onAudioContextStateChange, stream]);

  useEffect(() => {
    if (audioActivated && contextRef.current?.state === "suspended") {
      void contextRef.current
        .resume()
        .then(() =>
          onAudioContextStateChange?.(contextRef.current?.state ?? "inactive"),
        );
    }
  }, [audioActivated, onAudioContextStateChange]);

  return (
    <AvatarFrame displayName={displayName} imageUrl={imageUrl} mouth={mouth} />
  );
}

function AvatarFrame({
  displayName,
  imageUrl,
  mouth,
}: {
  displayName: string;
  imageUrl: string | null;
  mouth: "closed" | "small" | "medium" | "open";
}) {
  const mouthHeight = { closed: 2, small: 5, medium: 9, open: 14 }[mouth];
  const talking = mouth !== "closed";
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-black p-5 text-white">
      <div
        className={`relative aspect-square w-[min(72vw,280px)] max-w-full overflow-hidden rounded-full border-4 border-white/15 bg-zinc-800 shadow-2xl motion-reduce:transform-none ${talking ? "scale-[1.012] motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]" : ""}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${displayName} avatarı`}
            fill
            sizes="280px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-red-600 to-red-800 text-6xl font-black tracking-tighter">
            CG
          </div>
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-[22%] left-1/2 w-[17%] -translate-x-1/2 rounded-full bg-zinc-950/80 transition-[height] duration-75 motion-reduce:transition-none"
          style={{ height: mouthHeight }}
        />
      </div>
      <h3 className="mt-4 text-center text-lg font-black">{displayName}</h3>
      <span className="mt-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
        Dijital Avatar
      </span>
      <p className="mt-3 text-center text-xs text-zinc-400" aria-live="polite">
        {talking ? "Temsilci konuşuyor" : "Temsilci dinliyor"}
      </p>
    </div>
  );
}
