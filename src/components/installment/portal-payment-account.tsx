"use client";

import { useEffect, useState } from "react";
import { Building2, CircleAlert } from "lucide-react";

import { PortalCopyButton } from "@/components/installment/portal-copy-button";
import { createClient } from "@/lib/supabase/client";
import type { InstallmentPortalPaymentSnapshot } from "@/lib/installment/types";

export function PortalPaymentAccount({
  initialAccount,
  applicationNumber,
}: {
  initialAccount: InstallmentPortalPaymentSnapshot;
  applicationNumber: string;
}) {
  const [account, setAccount] = useState(initialAccount);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let active = true;
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    let noticeTimeout: ReturnType<typeof setTimeout> | undefined;

    const loadAccount = async (notify = false) => {
      const result = await client
        .from("payment_accounts")
        .select("id,bank_name,account_holder,iban,branch,description,is_active")
        .eq("id", initialAccount.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!active || result.error || !result.data) return;
      const nextAccount: InstallmentPortalPaymentSnapshot = {
        id: result.data.id,
        bankName: result.data.bank_name,
        accountHolder: result.data.account_holder,
        iban: result.data.iban,
        branch: result.data.branch,
        description: result.data.description,
      };
      setAccount(nextAccount);
      if (notify) {
        setUpdated(true);
        if (noticeTimeout) clearTimeout(noticeTimeout);
        noticeTimeout = setTimeout(() => {
          if (active) setUpdated(false);
        }, 5000);
      }
    };

    void loadAccount();
    const channel = client
      .channel(`installment-portal-payment-account:${initialAccount.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_accounts",
          filter: `id=eq.${initialAccount.id}`,
        },
        () => {
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => void loadAccount(true), 150);
        },
      )
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadAccount();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (noticeTimeout) clearTimeout(noticeTimeout);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void client.removeChannel(channel);
    };
  }, [initialAccount.id]);

  const formattedIban = account.iban.replace(/(.{4})/g, "$1 ").trim();
  return (
    <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_14px_45px_rgba(24,24,27,0.06)] sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-zinc-950 text-white">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Peşinat Ödeme Bilgileri
          </p>
          <h2 className="mt-1 text-lg font-black text-zinc-950">
            {account.bankName}
          </h2>
        </div>
      </div>
      {updated ? (
        <p
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
          role="status"
        >
          Ödeme bilgileri güncellendi. Lütfen aşağıdaki güncel hesabı kullanın.
        </p>
      ) : null}
      <dl className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite">
        <PaymentInfo label="Hesap sahibi" value={account.accountHolder} />
        <PaymentInfo
          label="Banka / Şube"
          value={
            account.branch
              ? `${account.bankName} · ${account.branch}`
              : account.bankName
          }
        />
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            IBAN
          </dt>
          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-mono text-sm font-black text-zinc-950 sm:text-base">
              {formattedIban}
            </span>
            <PortalCopyButton value={account.iban} label="IBAN'ı Kopyala" />
          </dd>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Ödeme açıklaması
          </dt>
          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-sm font-black text-zinc-950">
              {applicationNumber}
            </span>
            <PortalCopyButton
              value={applicationNumber}
              label="Açıklamayı Kopyala"
            />
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-3 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm leading-6 text-zinc-800">
        <CircleAlert
          className="mt-0.5 size-5 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <p>
          <strong>Bu ödeme tipi ticari ödemedir.</strong> Açıklama kısmını
          yazmayı unutmayınız.
        </p>
      </div>
    </section>
  );
}

function PaymentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-black text-zinc-950">{value}</dd>
    </div>
  );
}
