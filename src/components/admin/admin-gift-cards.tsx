"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createGiftCard,
  getAdminGiftCards,
  updateGiftCard,
} from "@/lib/credits";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/types/database";
import { Button } from "./../ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
export function AdminGiftCards() {
  const [items, setItems] = useState<Tables<"gift_cards">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [title, setTitle] = useState(""),
    [balance, setBalance] = useState(""),
    [single, setSingle] = useState(false),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await getAdminGiftCards();
    setItems(r.data ?? []);
    setError(r.error ?? "");
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(
      () =>
        items.filter(
          (x) =>
            (!active || String(x.is_active) === active) &&
            `${x.code} ${x.title}`.toLowerCase().includes(query.toLowerCase()),
        ),
      [items, query, active],
    ),
    pages = Math.max(1, Math.ceil(rows.length / 10)),
    paged = rows.slice((page - 1) * 10, page * 10);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createGiftCard({
      title,
      balance: Number(balance),
      currency: "TRY",
      is_active: true,
      is_single_use: single,
    });
    if (r.data) {
      setTitle("");
      setBalance("");
      await load();
    } else setError(r.error ?? "");
    setBusy(false);
  }
  async function action(id: string, type: "deactivate" | "topup") {
    const amount =
      type === "topup" ? Number(window.prompt("Yüklenecek tutar")) : 0;
    if (type === "topup" && (!amount || amount <= 0)) return;
    setBusy(true);
    const r = await updateGiftCard(id, type, amount);
    if (r.data) await load();
    else setError(r.error ?? "");
    setBusy(false);
  }
  return (
    <div className="space-y-5">
      <AdminCard>
        <AdminCardHeader
          title="Yeni hediye kartı"
          description="Güvenli kod otomatik oluşturulur."
        />
        <form onSubmit={create} className="grid gap-3 p-5 md:grid-cols-4">
          <input
            className={adminControlClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık"
            required
          />
          <input
            className={adminControlClass}
            type="number"
            min="1"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="Bakiye"
            required
          />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={single}
              onChange={(e) => setSingle(e.target.checked)}
            />
            Tek kullanımlık
          </label>
          <Button disabled={busy}>Oluştur</Button>
        </form>
      </AdminCard>
      <AdminCard>
        <AdminCardHeader
          title="Hediye kartları"
          description={`${rows.length} kart`}
        />
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
          <input
            className={adminControlClass}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Kod veya başlık…"
          />
          <select
            className={adminControlClass}
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm durumlar</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : (
          <AdminTable label="Hediye kartları">
            <thead>
              <tr>
                <AdminTh>Kod</AdminTh>
                <AdminTh>Başlık</AdminTh>
                <AdminTh>Bakiye</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh>İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {paged.map((x) => (
                <tr key={x.id}>
                  <AdminTd className="font-mono font-bold">
                    •••• {x.code.slice(-4)}
                  </AdminTd>
                  <AdminTd>{x.title}</AdminTd>
                  <AdminTd>{formatCurrency(x.balance)}</AdminTd>
                  <AdminTd>{x.is_active ? "Aktif" : "Pasif"}</AdminTd>
                  <AdminTd>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void action(x.id, "topup")}
                      >
                        Bakiye yükle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy || !x.is_active}
                        onClick={() => void action(x.id, "deactivate")}
                      >
                        Pasif yap
                      </Button>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
        <div className="flex justify-between border-t p-4 text-sm">
          <span>
            Sayfa {page}/{pages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Önceki
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
