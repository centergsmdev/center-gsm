"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import type { InstallmentContractTemplate } from "@/lib/installment/types";
import { adminControlClass, AdminField } from "@/components/admin/admin-form";

export function AdminInstallmentContracts() {
  const [templates, setTemplates] = useState<InstallmentContractTemplate[]>([]);
  const [title, setTitle] = useState("Elden Taksitli Satış Sözleşmesi");
  const [version, setVersion] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const active = useMemo(
    () => templates.find((item) => item.isActive) ?? null,
    [templates],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/installment-contracts", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        templates?: InstallmentContractTemplate[];
        error?: string;
      };
      if (!response.ok || !payload.templates)
        throw new Error(payload.error || "Sözleşmeler yüklenemedi.");
      setTemplates(payload.templates);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Sözleşmeler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => void load(), []);

  async function createVersion() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/installment-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, version, contentHtml }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Yeni versiyon oluşturulamadı.");
      setVersion("");
      setContentHtml("");
      setMessage(
        "Yeni sözleşme versiyonu oluşturuldu. Aktifleştirilene kadar müşterilere gösterilmez.",
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Yeni versiyon oluşturulamadı.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function activate(template: InstallmentContractTemplate) {
    if (
      !window.confirm(
        `${template.version} versiyonunu yeni başvurular için aktif etmek istediğinize emin misiniz?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/installment-contracts/${template.id}/activate`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Versiyon aktif edilemedi.");
      setMessage(`${template.version} yeni başvurular için aktif edildi.`);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Versiyon aktif edilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-52 items-center justify-center text-sm font-semibold text-zinc-600">
        <LoaderCircle className="mr-2 size-5 animate-spin" /> Sözleşmeler
        yükleniyor…
      </div>
    );

  return (
    <div className="space-y-6">
      {error || message ? (
        <p
          className={`flex items-center gap-2 rounded-xl p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
          role={error ? "alert" : "status"}
        >
          {error ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {error || message}
        </p>
      ) : null}

      <AdminCard>
        <AdminCardHeader
          title="Aktif sözleşme"
          description="Yeni başvurularda müşteriye gösterilen sürüm"
        />
        <div className="p-5 sm:p-6">
          {active ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4">
                <div>
                  <p className="font-bold text-emerald-950">{active.title}</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {active.version} · SHA-256 {active.contentHash.slice(0, 12)}
                    …
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="size-4" /> Aktif
                </span>
              </div>
              <div
                className="rich-product-content break-words rounded-xl border border-zinc-200 p-4 text-sm leading-7 text-zinc-700 sm:p-6"
                dangerouslySetInnerHTML={{ __html: active.contentHtml }}
              />
            </div>
          ) : (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              Aktif sözleşme bulunmuyor. Müşteri başvuruları gönderilemez.
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Yeni versiyon oluştur"
          description="Aktif metin değiştirilmez; her değişiklik yeni ve denetlenebilir bir sürüm olarak kaydedilir."
        />
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Sözleşme adı" htmlFor="contract-title">
              <input
                id="contract-title"
                className={adminControlClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
              />
            </AdminField>
            <AdminField label="Yeni versiyon" htmlFor="contract-version">
              <input
                id="contract-version"
                className={adminControlClass}
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="v2-2026-09-01"
                maxLength={40}
              />
            </AdminField>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-900">
            Kullanılabilir alanlar: <code>{"{{customer_name}}"}</code>,{" "}
            <code>{"{{product_name}}"}</code>, <code>{"{{variant_name}}"}</code>
            , <code>{"{{product_price}}"}</code> ve{" "}
            <code>{"{{application_date}}"}</code>,{" "}
            <code>{"{{down_payment_rate}}"}</code>,{" "}
            <code>{"{{down_payment_amount}}"}</code>,{" "}
            <code>{"{{remaining_principal}}"}</code>,{" "}
            <code>{"{{finance_charge_rate}}"}</code>,{" "}
            <code>{"{{finance_charge_amount}}"}</code>,{" "}
            <code>{"{{installment_count}}"}</code>,{" "}
            <code>{"{{installment_schedule}}"}</code> ve{" "}
            <code>{"{{total_payable}}"}</code>.
          </div>
          {active ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitle(active.title);
                setContentHtml(active.contentHtml);
              }}
            >
              <Copy className="size-4" /> Aktif metni yeni versiyona kopyala
            </Button>
          ) : null}
          <RichTextEditor
            id="installment-contract-content"
            value={contentHtml}
            onChange={setContentHtml}
            ariaLabel="Yeni sözleşme içeriği"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={
                busy ||
                title.trim().length < 3 ||
                !version.trim() ||
                contentHtml.trim().length < 100
              }
              onClick={() => void createVersion()}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Yeni versiyonu oluştur
            </Button>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Versiyon geçmişi"
          description="Eski sürümler ve aktiflik durumu"
        />
        <div className="divide-y divide-zinc-100">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-bold text-zinc-950">
                  {template.version} {template.isActive ? "· Aktif" : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(template.createdAt))}
                  {" · "}SHA-256 {template.contentHash.slice(0, 12)}…
                </p>
              </div>
              {!template.isActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void activate(template)}
                >
                  Bu versiyonu aktif et
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
