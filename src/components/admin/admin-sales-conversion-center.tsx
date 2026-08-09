"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Plus, Save } from "lucide-react";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import {
  AdminField,
  AdminFormSection,
  adminControlClass,
} from "@/components/admin/admin-form";
import { CampaignCountdown } from "@/components/sales-campaign/countdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  SalesCampaign,
  SalesCampaignBadge,
  SalesCampaignScope,
} from "@/types/sales-campaign";

type Option = { id: string; name: string };
type Preview = "popup" | "header" | "product";
type CampaignDraft = Omit<SalesCampaign, "id" | "created_at" | "updated_at">;

const emptyDraft = (): CampaignDraft => ({
  campaign_name: "",
  title: "",
  description: "",
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  cta_text: "Ürünleri İncele",
  cta_href: "/urunler",
  is_active: true,
  show_popup: true,
  show_header: true,
  show_product_detail: true,
  show_cart: true,
  show_exit_intent: false,
  show_badges: true,
  popup_delay_seconds: 8,
  scope_type: "all",
  category_ids: [],
  category_names: [],
  brand_ids: [],
  brand_names: [],
  product_ids: [],
  badge_types: ["limited"],
});

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toggles: Array<[keyof CampaignDraft, string]> = [
  ["show_popup", "Popup"],
  ["show_header", "Üst duyuru çubuğu"],
  ["show_product_detail", "Ürün detayı"],
  ["show_cart", "Sepet hatırlatması"],
  ["show_exit_intent", "Masaüstü çıkış niyeti"],
  ["show_badges", "Kampanya rozetleri"],
];

const badgeOptions: Array<[SalesCampaignBadge, string]> = [
  ["limited", "Sınırlı Süre"],
  ["ends_today", "Bugün Bitiyor"],
  ["opportunity", "Kampanyalı Ürün"],
];

export function AdminSalesConversionCenter() {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([]);
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [preview, setPreview] = useState<Preview>("popup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const client = createClient();
    if (!client) return setLoading(false);
    const [campaignResult, categoryResult, brandResult, productResult] =
      await Promise.all([
        client
          .from("sales_campaigns")
          .select("*")
          .order("created_at", { ascending: false }),
        client
          .from("categories")
          .select("id,name")
          .eq("is_active", true)
          .order("name"),
        client
          .from("brands")
          .select("id,name")
          .eq("is_active", true)
          .order("name"),
        client
          .from("products")
          .select("id,name")
          .eq("is_active", true)
          .order("name"),
      ]);
    setCampaigns(campaignResult.data ?? []);
    setCategories(categoryResult.data ?? []);
    setBrands(brandResult.data ?? []);
    setProducts(productResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  const scopeOptions = useMemo(() => {
    if (draft.scope_type === "categories") return categories;
    if (draft.scope_type === "brands") return brands;
    if (draft.scope_type === "products") return products;
    return [];
  }, [brands, categories, draft.scope_type, products]);

  const selectedScopeIds =
    draft.scope_type === "categories"
      ? draft.category_ids
      : draft.scope_type === "brands"
        ? draft.brand_ids
        : draft.product_ids;

  const update = <K extends keyof CampaignDraft>(
    key: K,
    value: CampaignDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const selectCampaign = (campaign: SalesCampaign) => {
    const { id, created_at, updated_at, ...values } = campaign;
    void id;
    void created_at;
    void updated_at;
    setSelectedId(campaign.id);
    setDraft(values);
    setMessage("");
  };

  const save = async () => {
    setMessage("");
    if (
      !draft.campaign_name.trim() ||
      !draft.title.trim() ||
      !draft.description.trim()
    )
      return setMessage("Kampanya adı, başlık ve açıklama zorunludur.");
    if (new Date(draft.ends_at) <= new Date(draft.starts_at))
      return setMessage("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
    const client = createClient();
    if (!client) return setMessage("Veritabanı bağlantısı kullanılamıyor.");
    setSaving(true);
    const result = selectedId
      ? await client
          .from("sales_campaigns")
          .update(draft)
          .eq("id", selectedId)
          .select("*")
          .single()
      : await client.from("sales_campaigns").insert(draft).select("*").single();
    setSaving(false);
    if (result.error) return setMessage(result.error.message);
    setMessage("Kampanya güvenli şekilde kaydedildi.");
    setSelectedId(result.data.id);
    await load();
  };

  const setScope = (scope: SalesCampaignScope) => update("scope_type", scope);
  const toggleScopeItem = (option: Option) => {
    const active = selectedScopeIds.includes(option.id);
    const ids = active
      ? selectedScopeIds.filter((id) => id !== option.id)
      : [...selectedScopeIds, option.id];
    if (draft.scope_type === "categories") {
      update("category_ids", ids);
      update(
        "category_names",
        categories
          .filter((item) => ids.includes(item.id))
          .map((item) => item.name),
      );
    } else if (draft.scope_type === "brands") {
      update("brand_ids", ids);
      update(
        "brand_names",
        brands.filter((item) => ids.includes(item.id)).map((item) => item.name),
      );
    } else if (draft.scope_type === "products") update("product_ids", ids);
  };

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 pb-12">
      <AdminCard>
        <AdminCardHeader
          title="Kampanyalar"
          description="Aktif ve planlanmış satış teşviklerini yönetin."
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setDraft(emptyDraft());
                setMessage("");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white"
            >
              <Plus size={16} /> Yeni kampanya
            </button>
          }
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => selectCampaign(campaign)}
              className={cn(
                "rounded-xl border p-4 text-left",
                selectedId === campaign.id
                  ? "border-red-500 bg-red-50"
                  : "border-zinc-200 hover:border-zinc-400",
              )}
            >
              <span className="block font-bold">{campaign.campaign_name}</span>
              <span className="mt-1 block text-xs text-zinc-500">
                {campaign.is_active ? "Aktif" : "Pasif"} ·{" "}
                {new Date(campaign.ends_at).toLocaleString("tr-TR")}
              </span>
            </button>
          ))}
          {!campaigns.length ? (
            <p className="text-sm text-zinc-500">
              Henüz kampanya oluşturulmadı.
            </p>
          ) : null}
        </div>
      </AdminCard>

      <AdminFormSection
        title="Kampanya içeriği"
        description="Müşteriye gösterilecek metin ve yönlendirmeyi belirleyin."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label="Kampanya adı" htmlFor="campaign-name" required>
            <input
              id="campaign-name"
              className={adminControlClass}
              value={draft.campaign_name}
              onChange={(e) => update("campaign_name", e.target.value)}
            />
          </AdminField>
          <AdminField label="Başlık" htmlFor="campaign-title" required>
            <input
              id="campaign-title"
              className={adminControlClass}
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </AdminField>
          <AdminField
            label="Açıklama"
            htmlFor="campaign-description"
            required
            className="md:col-span-2"
          >
            <textarea
              id="campaign-description"
              className="min-h-24 w-full rounded-lg border border-zinc-200 p-3.5 text-sm outline-none focus:border-red-500"
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </AdminField>
          <AdminField label="Başlangıç" htmlFor="starts-at">
            <input
              id="starts-at"
              type="datetime-local"
              className={adminControlClass}
              value={toLocalInput(draft.starts_at)}
              onChange={(e) =>
                update("starts_at", new Date(e.target.value).toISOString())
              }
            />
          </AdminField>
          <AdminField label="Bitiş" htmlFor="ends-at">
            <input
              id="ends-at"
              type="datetime-local"
              className={adminControlClass}
              value={toLocalInput(draft.ends_at)}
              onChange={(e) =>
                update("ends_at", new Date(e.target.value).toISOString())
              }
            />
          </AdminField>
          <AdminField label="CTA metni" htmlFor="cta-text">
            <input
              id="cta-text"
              className={adminControlClass}
              value={draft.cta_text}
              onChange={(e) => update("cta_text", e.target.value)}
            />
          </AdminField>
          <AdminField label="CTA bağlantısı" htmlFor="cta-href">
            <input
              id="cta-href"
              className={adminControlClass}
              value={draft.cta_href}
              onChange={(e) => update("cta_href", e.target.value)}
            />
          </AdminField>
          <AdminField label="Popup gecikmesi (saniye)" htmlFor="popup-delay">
            <input
              id="popup-delay"
              type="number"
              min={0}
              max={300}
              className={adminControlClass}
              value={draft.popup_delay_seconds}
              onChange={(e) =>
                update("popup_delay_seconds", Number(e.target.value))
              }
            />
          </AdminField>
          <label className="flex h-11 items-center gap-3 self-end rounded-lg border border-zinc-200 px-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
            />{" "}
            Kampanya aktif
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Gösterim alanları"
        description="Her görünürlüğü birbirinden bağımsız açıp kapatın."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {toggles.map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
            >
              <input
                type="checkbox"
                checked={Boolean(draft[key])}
                onChange={(e) => update(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Kampanya kapsamı"
        description="Kampanyanın hangi ürünlerde gösterileceğini seçin."
      >
        <div className="flex flex-wrap gap-2">
          {(
            ["all", "categories", "brands", "products"] as SalesCampaignScope[]
          ).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setScope(scope)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold",
                draft.scope_type === scope
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200",
              )}
            >
              {scope === "all"
                ? "Tüm ürünler"
                : scope === "categories"
                  ? "Kategoriler"
                  : scope === "brands"
                    ? "Markalar"
                    : "Ürünler"}
            </button>
          ))}
        </div>
        {scopeOptions.length ? (
          <div className="mt-5 grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {scopeOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={selectedScopeIds.includes(option.id)}
                  onChange={() => toggleScopeItem(option)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {badgeOptions.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={draft.badge_types.includes(value)}
                onChange={() =>
                  update(
                    "badge_types",
                    draft.badge_types.includes(value)
                      ? draft.badge_types.filter((item) => item !== value)
                      : [...draft.badge_types, value],
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Canlı önizleme"
        description="Popup, üst çubuk ve ürün detayı görünümünü kaydetmeden kontrol edin."
      >
        <div className="mb-5 flex gap-2">
          {(["popup", "header", "product"] as Preview[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPreview(item)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
                preview === item ? "bg-red-600 text-white" : "bg-zinc-100",
              )}
            >
              <Eye size={15} />
              {item === "popup"
                ? "Popup"
                : item === "header"
                  ? "Üst çubuk"
                  : "Ürün detayı"}
            </button>
          ))}
        </div>
        {preview === "header" ? (
          <div className="rounded-xl bg-zinc-950 p-3 text-center text-sm font-bold text-white">
            {draft.title} ·{" "}
            <CampaignCountdown endsAt={draft.ends_at} now={now} />
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto max-w-xl rounded-3xl p-6",
              preview === "popup"
                ? "bg-zinc-950 text-white shadow-2xl"
                : "border border-emerald-200 bg-emerald-50 text-zinc-950",
            )}
          >
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500">
              {draft.campaign_name || "Kampanya"}
            </p>
            <h3 className="mt-2 text-2xl font-black">
              {draft.title || "Kampanya başlığı"}
            </h3>
            <p className="mt-2 text-sm opacity-75">
              {draft.description || "Kampanya açıklaması"}
            </p>
            <CampaignCountdown
              endsAt={draft.ends_at}
              now={now}
              className="mt-4 block font-black"
            />
            <span className="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 font-bold text-zinc-950">
              {draft.cta_text}
            </span>
          </div>
        )}
      </AdminFormSection>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <p
          className={cn(
            "text-sm",
            message.includes("kaydedildi")
              ? "text-emerald-700"
              : "text-red-600",
          )}
        >
          {message}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-red-600 px-6 font-bold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}{" "}
          Kampanyayı kaydet
        </button>
      </div>
    </div>
  );
}
