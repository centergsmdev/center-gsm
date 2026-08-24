"use client";

import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { portalReceiptPath } from "@/lib/installment/customer-portal-path";
import type { InstallmentCustomerPortalReceipt } from "@/lib/installment/customer-portal-server";
import type { InstallmentPortalStage } from "@/lib/installment/types";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function PortalReceiptUpload({
  portalId,
  initialReceipt,
  initialStage,
}: {
  portalId: string;
  initialReceipt: InstallmentCustomerPortalReceipt | null;
  initialStage: InstallmentPortalStage;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState(initialReceipt);
  const [stage, setStage] = useState(initialStage);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(portalReceiptPath(portalId), {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        receipt: InstallmentCustomerPortalReceipt | null;
        stage: InstallmentPortalStage;
      };
      const changed =
        body.stage !== stage ||
        body.receipt?.id !== receipt?.id ||
        body.receipt?.status !== receipt?.status;
      setReceipt(body.receipt);
      setStage(body.stage);
      if (changed) router.refresh();
    } catch {
      // Temporary connectivity loss should not hide the current portal state.
    }
  }, [portalId, receipt?.id, receipt?.status, router, stage]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshStatus(), 10_000);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void refreshStatus();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshStatus]);

  function selectFile(selected: File | null) {
    setError(null);
    if (!selected) return setFile(null);
    if (!ACCEPTED.has(selected.type)) {
      setFile(null);
      return setError(
        "Yalnızca JPG, PNG, WebP veya PDF dekont yükleyebilirsiniz.",
      );
    }
    if (selected.size < 1 || selected.size > MAX_SIZE) {
      setFile(null);
      return setError("Dekont dosyası en fazla 10 MB olabilir.");
    }
    setFile(selected);
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch(portalReceiptPath(portalId), {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        receipt?: InstallmentCustomerPortalReceipt;
        error?: string;
      };
      if (!response.ok || !body.receipt)
        throw new Error(body.error || "Dekont yüklenemedi.");
      setReceipt(body.receipt);
      setStage("payment_under_review");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Dekont yüklenemedi.",
      );
    } finally {
      setUploading(false);
    }
  }

  const canUpload =
    stage === "down_payment_pending" ||
    stage === "payment_under_review" ||
    stage === "payment_confirmed";
  const paymentApproved =
    stage === "payment_confirmed" ||
    stage === "preparing_delivery" ||
    stage === "completed";

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-zinc-950 text-white">
          <FileUp className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Peşinat Ödeme Onayı
          </p>
          <h2 className="mt-1 text-lg font-black text-zinc-950">
            Dekontunuzu Güvenle Yükleyin
          </h2>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      {stage === "payment_under_review" ? (
        <StatusBox
          icon={Clock3}
          tone="amber"
          title="Peşinat kontrol ediliyor"
          description={
            receipt?.status === "pending_review"
              ? `${receipt.originalName} başarıyla alındı. CENTER GSM ödeme kontrolünü tamamladığında bu ekran otomatik güncellenecek.`
              : "Ödeme durumunuz yönetici tarafından yeniden incelemeye alındı. Bu ekran otomatik güncellenecek."
          }
        />
      ) : paymentApproved ? (
        <StatusBox
          icon={CheckCircle2}
          tone="emerald"
          title="Peşinat ödemeniz onaylandı"
          description="Dekont ve ödeme kontrolünüz tamamlandı. İşleminizin sonraki aşamasını bu sayfadan takip edebilirsiniz."
        />
      ) : receipt?.status === "rejected" ? (
        <StatusBox
          icon={XCircle}
          tone="red"
          title="Dekont yeniden yüklenmeli"
          description={
            receipt.rejectionReason ||
            "Dekont doğrulanamadı. Lütfen doğru dekontu yeniden yükleyin."
          }
        />
      ) : receipt?.status === "pending_review" ? (
        <StatusBox
          icon={Clock3}
          tone="amber"
          title="Dekontunuz inceleniyor"
          description={`${receipt.originalName} başarıyla alındı. CENTER GSM ödeme kontrolünü tamamladığında bu ekran otomatik güncellenecek.`}
        />
      ) : (
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          Havale / EFT işlemini yaptıktan sonra dekontunuzu buradan yükleyin.
          Dosyanız yalnız yetkili yöneticiler tarafından görüntülenebilir.
        </p>
      )}

      {canUpload && receipt && !file ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-9 rounded-full px-4 text-xs font-black"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="size-4" />
          Yeni Dekont Yükle
        </Button>
      ) : null}

      {canUpload && (!receipt || file) ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 sm:p-5">
          <button
            type="button"
            className="flex w-full items-center gap-3 text-left"
            onClick={() => inputRef.current?.click()}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white text-zinc-700 shadow-sm">
              <FileCheck2 className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black text-zinc-950">
                {file ? file.name : "Dekont dosyasını seçin"}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                JPG, PNG, WebP veya PDF · en fazla 10 MB
              </span>
            </span>
          </button>
          <Button
            type="button"
            className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!file || uploading}
            onClick={() => void upload()}
          >
            <FileUp className="size-4" />
            {uploading
              ? "Güvenli alana yükleniyor…"
              : receipt
                ? "Yeni Dekontu Yükle ve Onaya Gönder"
                : "Dekontu Yükle ve Onaya Gönder"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}

function StatusBox({
  icon: Icon,
  tone,
  title,
  description,
}: {
  icon: typeof Clock3;
  tone: "amber" | "emerald" | "red";
  title: string;
  description: string;
}) {
  const colors = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div className={`mt-5 flex gap-3 rounded-2xl border p-4 ${colors}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
      </div>
    </div>
  );
}
