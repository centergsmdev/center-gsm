"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Grid2X2, Menu, Sparkles, X } from "lucide-react";

type NavigationCategory = { name: string; slug: string };

export function MobileNavigation({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Ana menüyü kapat" : "Ana menüyü aç"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((current) => !current)}
        className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white text-zinc-800 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0, scale: open ? 0.88 : 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </motion.span>
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div className="fixed inset-0 z-modal lg:hidden">
                  <motion.button
                    type="button"
                    aria-label="Mobil menüyü kapat"
                    className="absolute inset-0 cursor-default bg-zinc-950/45 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    onClick={close}
                  />

                  <motion.nav
                    id="mobile-navigation"
                    aria-label="Mobil ürün kategorileri"
                    className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col overflow-hidden rounded-r-[28px] border-r border-white/10 bg-white shadow-[24px_0_80px_rgba(0,0,0,0.24)]"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  >
                    <div className="relative overflow-hidden bg-zinc-950 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
                      <div className="absolute -right-16 -top-16 size-40 rounded-full bg-red-600/25 blur-3xl" />
                      <div className="relative flex items-center justify-between gap-4">
                        <Link
                          href="/"
                          onClick={close}
                          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <span className="grid size-10 place-items-center rounded-xl bg-white text-sm font-black text-zinc-950 shadow-lg">
                            C
                          </span>
                          <span>
                            <span className="block text-lg font-black leading-none tracking-[-0.05em]">
                              CENTER<span className="text-red-500">GSM</span>
                            </span>
                            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.24em] text-zinc-400">
                              Teknolojinin Merkezi
                            </span>
                          </span>
                        </Link>
                        <button
                          ref={closeButtonRef}
                          type="button"
                          onClick={close}
                          aria-label="Menüyü kapat"
                          className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                      <p className="relative mt-5 text-xs leading-5 text-zinc-400">
                        Aradığınız teknolojiye hızlıca ulaşın.
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                      <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        Alışveriş
                      </p>
                      <Link
                        href="/urunler"
                        onClick={close}
                        className="group flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-black text-primary transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-white shadow-sm">
                          <Grid2X2 className="size-4" />
                        </span>
                        <span className="flex-1">Tüm Ürünler</span>
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>

                      <div className="mt-3 space-y-1">
                        {categories.map((category, index) => (
                          <motion.div
                            key={category.slug}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: Math.min(index * 0.035, 0.24),
                              duration: 0.24,
                            }}
                          >
                            <Link
                              href={`/kategori/${category.slug}`}
                              onClick={close}
                              className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <span className="size-1.5 rounded-full bg-zinc-300 transition-colors group-hover:bg-primary" />
                              <span className="flex-1">{category.name}</span>
                              <ChevronRight className="size-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-600" />
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 bg-zinc-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <Link
                        href="/#deals"
                        onClick={close}
                        className="group flex items-center gap-3 rounded-2xl border border-red-100 bg-white px-4 py-3.5 text-sm font-black text-zinc-950 shadow-sm transition-all hover:border-red-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-white">
                          <Sparkles className="size-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block">Kampanyalar</span>
                          <span className="mt-0.5 block text-[10px] font-medium text-zinc-500">
                            Güncel fırsatları keşfedin
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </motion.nav>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
