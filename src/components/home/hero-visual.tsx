"use client";

const HERO_VISUAL_LABELS = {
  original: "Akıllı telefon, akıllı saat ve oyun konsolu",
  workspace: "Dizüstü bilgisayar, tablet ve kablosuz kulaklık",
} as const;

export function HeroVisual({
  variant = "original",
}: {
  variant?: keyof typeof HERO_VISUAL_LABELS;
}) {
  return (
    <div
      className="launch-hero-visual"
      role="img"
      aria-label={HERO_VISUAL_LABELS[variant]}
    />
  );
}
