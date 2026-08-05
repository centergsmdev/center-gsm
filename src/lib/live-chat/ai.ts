import {
  loadSmartSearchIndex,
  smartProductIds,
} from "@/lib/search/smart-search";
import { createPublicClient } from "@/lib/supabase/public";
import type { LiveChatMessage } from "@/types/database";

const HANDOFF_MESSAGE = "Müşteri temsilcimiz size yardımcı olacaktır.";
const RESTRICTED_TOPICS =
  /kesin teslim|ne zaman gelir|stok garant|pazarlık|özel indirim|indirim yap|hukuk|dava|iade.*(onay|karar)|muhasebe|fatura.*(değiş|iptal)/i;

type AiProduct = {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  warranty_months: number;
  show_installments: boolean;
  installment_count: number;
  installment_note: string | null;
  brand: string;
  category: string;
  variants: Array<{
    name: string;
    price: number;
    old_price: number | null;
    stock_quantity: number;
    storage_value: number | null;
    storage_unit: "GB" | "TB" | null;
    color: string | null;
    attributes: unknown;
  }>;
};

function plainText(value: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export async function loadAiProductContext(query: string) {
  const client = createPublicClient();
  if (!client) return [];
  const index = await loadSmartSearchIndex(client);
  if (!index) return [];
  const ids = smartProductIds(index, query).slice(0, 5);
  if (!ids.length) return [];
  const [products, variants, colors, brands, categories] = await Promise.all([
    client.from("products").select("*").in("id", ids).eq("is_active", true),
    client
      .from("product_variants")
      .select("*")
      .in("product_id", ids)
      .eq("is_active", true),
    client
      .from("product_colors")
      .select("*")
      .in("product_id", ids)
      .eq("is_active", true),
    client.from("brands").select("*").eq("is_active", true),
    client.from("categories").select("*").eq("is_active", true),
  ]);
  if (
    products.error ||
    variants.error ||
    colors.error ||
    brands.error ||
    categories.error
  )
    return [];
  const brandMap = new Map(brands.data.map((item) => [item.id, item.name]));
  const categoryMap = new Map(
    categories.data.map((item) => [item.id, item.name]),
  );
  const colorMap = new Map(
    colors.data.map((item) => [item.id, item.display_name ?? item.name]),
  );
  return ids.flatMap<AiProduct>((id) => {
    const product = products.data.find((item) => item.id === id);
    if (!product) return [];
    return [
      {
        name: product.name,
        slug: product.slug,
        description: plainText(product.description),
        price: product.price,
        old_price: product.old_price,
        stock_quantity: product.stock_quantity,
        warranty_months: product.warranty_months,
        show_installments: product.show_installments,
        installment_count: product.installment_count,
        installment_note: product.installment_note,
        brand: brandMap.get(product.brand_id) ?? "",
        category: categoryMap.get(product.category_id) ?? "",
        variants: variants.data
          .filter((variant) => variant.product_id === id)
          .slice(0, 12)
          .map((variant) => ({
            name: variant.name,
            price: variant.price,
            old_price: variant.old_price,
            stock_quantity: variant.stock_quantity,
            storage_value: variant.storage_value,
            storage_unit: variant.storage_unit,
            color: variant.color_id
              ? (colorMap.get(variant.color_id) ?? null)
              : null,
            attributes: variant.attributes,
          })),
      },
    ];
  });
}

function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown[] }).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) =>
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text"
          ? [String((part as { text?: string }).text ?? "")]
          : [],
      );
    })
    .join("")
    .trim();
}

async function readStream(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data) as {
          type?: string;
          delta?: string;
          response?: unknown;
        };
        if (event.type === "response.output_text.delta")
          answer += event.delta ?? "";
        if (!answer && event.type === "response.completed")
          answer = responseText(event.response);
      } catch {
        // Ignore incomplete or non-JSON SSE lines.
      }
    }
  }
  return answer.trim();
}

export async function createAiAnswer(
  customerMessage: string,
  history: LiveChatMessage[],
) {
  if (RESTRICTED_TOPICS.test(customerMessage)) return HANDOFF_MESSAGE;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const products = await loadAiProductContext(customerMessage);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://centergsm.com.tr";
  const catalog = products.map((product) => ({
    ...product,
    url: `${siteUrl}/urun/${product.slug}`,
  }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol",
        stream: true,
        max_output_tokens: 450,
        instructions:
          `Sen CENTER GSM müşteri destek asistanısın. Yalnızca verilen KATALOG verilerini ve konuşmayı kullan. ` +
          `Verilmeyen fiyat, stok, özellik, kampanya veya politika bilgisini asla uydurma. Stok miktarını kesin garanti etme; yalnızca mevcut kayıt durumunu belirt. ` +
          `Kesin teslim tarihi, pazarlık, özel indirim sözü, hukuki konu, iade kararı veya muhasebe işlemi sorulursa yalnızca \"${HANDOFF_MESSAGE}\" yaz. ` +
          `Katalogda yeterli gerçek veri yoksa aynı yönlendirme cümlesini kullan. Türkçe, kısa, açık ve yardımsever cevap ver.`,
        input: [
          ...history.slice(-10).map((item) => ({
            role: item.sender === "customer" ? "user" : "assistant",
            content: item.body,
          })),
          {
            role: "user",
            content: `Müşteri mesajı: ${customerMessage}\nKATALOG: ${JSON.stringify(catalog)}`,
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const answer = await readStream(response);
    return answer || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
