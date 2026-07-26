"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adjustPoints, getAdminLoyalty, saveRewardRule } from "@/lib/loyalty";
import type { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
type Data = {
  accounts: Tables<"loyalty_accounts">[];
  transactions: Tables<"loyalty_transactions">[];
  rules: Tables<"reward_rules">[];
};
export function AdminLoyalty() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [page, setPage] = useState(1),
    [userId, setUserId] = useState(""),
    [points, setPoints] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await getAdminLoyalty();
    setData(r.data);
    setError(r.error ?? "");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(
    () =>
      data?.transactions.filter(
        (x) =>
          (!type || x.type === type) &&
          `${x.user_id} ${x.description ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ) ?? [],
    [data, query, type],
  );
  const paged = rows.slice((page - 1) * 15, page * 15),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await adjustPoints(userId, Number(points), reason);
    if (r.data !== null) {
      setUserId("");
      setPoints("");
      setReason("");
      await load();
    } else setError(r.error ?? "");
    setBusy(false);
  }
  async function save(rule: Tables<"reward_rules">) {
    setBusy(true);
    const r = await saveRewardRule(rule);
    if (r.data) await load();
    else setError(r.error ?? "");
    setBusy(false);
  }
  if (!data && !error) return <AdminLoadingState />;
  if (error && !data) return <AdminErrorState retry={() => void load()} />;
  return (
    <div className="space-y-5">
      <AdminCard>
        <AdminCardHeader
          title="Manuel puan hareketi"
          description="Pozitif değer puan ekler, negatif değer puan siler."
        />
        <form onSubmit={adjust} className="grid gap-3 p-5 md:grid-cols-4">
          <input
            className={adminControlClass}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Kullanıcı UUID"
            required
          />
          <input
            className={adminControlClass}
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Puan (+/-)"
            required
          />
          <input
            className={adminControlClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="İşlem nedeni"
            required
          />
          <Button disabled={busy}>Uygula</Button>
        </form>
      </AdminCard>
      <AdminCard>
        <AdminCardHeader
          title="Puan kuralları"
          description="Kazanç oranını ve kullanım limitini yönetin."
        />
        <div className="space-y-3 p-5">
          {data?.rules.map((rule) => (
            <RuleEditor key={rule.id} rule={rule} busy={busy} save={save} />
          ))}
        </div>
      </AdminCard>
      <AdminCard>
        <AdminCardHeader
          title="Puan hareketleri"
          description={`${rows.length} işlem`}
        />
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
          <input
            type="search"
            className={adminControlClass}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Kullanıcı veya açıklama…"
          />
          <select
            className={adminControlClass}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm hareketler</option>
            {[
              "earn",
              "redeem",
              "refund",
              "bonus",
              "manual_add",
              "manual_remove",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <AdminTable label="Puan hareketleri">
          <thead>
            <tr>
              <AdminTh>Tarih</AdminTh>
              <AdminTh>Kullanıcı</AdminTh>
              <AdminTh>İşlem</AdminTh>
              <AdminTh>Puan</AdminTh>
              <AdminTh>Bakiye</AdminTh>
            </tr>
          </thead>
          <tbody>
            {paged.map((x) => (
              <tr key={x.id}>
                <AdminTd>
                  {new Date(x.created_at).toLocaleString("tr-TR")}
                </AdminTd>
                <AdminTd className="font-mono text-xs">{x.user_id}</AdminTd>
                <AdminTd>{x.type}</AdminTd>
                <AdminTd className="font-bold">{x.points}</AdminTd>
                <AdminTd>{x.balance_after}</AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
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
function RuleEditor({
  rule,
  busy,
  save,
}: {
  rule: Tables<"reward_rules">;
  busy: boolean;
  save: (r: Tables<"reward_rules">) => Promise<void>;
}) {
  const [value, setValue] = useState(rule);
  return (
    <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-6">
      <input
        className={adminControlClass}
        value={value.name}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
      />
      <select
        className={adminControlClass}
        value={value.rule_type}
        onChange={(e) =>
          setValue({
            ...value,
            rule_type: e.target.value as typeof value.rule_type,
          })
        }
      >
        {[
          "purchase",
          "first_order",
          "birthday",
          "category",
          "brand",
          "campaign",
        ].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <input
        className={adminControlClass}
        type="number"
        step="0.01"
        value={value.points_per_try}
        onChange={(e) =>
          setValue({ ...value, points_per_try: Number(e.target.value) })
        }
      />
      <input
        className={adminControlClass}
        type="number"
        value={value.minimum_order_amount}
        onChange={(e) =>
          setValue({ ...value, minimum_order_amount: Number(e.target.value) })
        }
      />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={value.is_active}
          onChange={(e) => setValue({ ...value, is_active: e.target.checked })}
        />
        Aktif
      </label>
      <Button type="button" disabled={busy} onClick={() => void save(value)}>
        Kaydet
      </Button>
    </div>
  );
}
