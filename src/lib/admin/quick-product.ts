import type { AdminProductReference } from "@/types/admin-product";

export type QuickProductDraft = {
  name: string;
  slug: string;
  sku: string;
  brandId: string;
  categoryId: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  warrantyMonths: number;
  color: string;
  storageValue: number | null;
  storageUnit: "GB" | "TB" | null;
  ram: string;
  description: string;
};

const TURKISH_CHARACTERS: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

export function quickProductSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(
      /[çğıöşü]/g,
      (character) => TURKISH_CHARACTERS[character] ?? character,
    )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalized(value: string) {
  return quickProductSlug(value).replaceAll("-", " ");
}

function findReference(query: string, references: AdminProductReference[]) {
  const value = normalized(query);
  return (
    references.find((item) => value.startsWith(normalized(item.name))) ??
    references.find((item) => value.includes(normalized(item.name))) ??
    null
  );
}

function parseMoney(value: string) {
  const clean = value.replace(/[^\d.,]/g, "");
  if (!clean) return 0;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const fractionLength =
    decimalIndex >= 0 ? clean.length - decimalIndex - 1 : 0;
  const normalizedValue =
    fractionLength > 0 && fractionLength <= 2
      ? `${clean.slice(0, decimalIndex).replace(/[.,]/g, "")}.${clean.slice(decimalIndex + 1)}`
      : clean.replace(/[.,]/g, "");
  return Number(normalizedValue) || 0;
}

function categoryKeywords(source: string) {
  const rules = [
    ["telefon", ["telefon", "iphone", "galaxy", "nova"]],
    ["tablet", ["tablet", "ipad", "matepad"]],
    ["laptop", ["laptop", "notebook", "macbook"]],
    ["akıllı saat", ["akıllı saat", "smart watch", "watch"]],
    ["kulaklık", ["kulaklık", "headphone", "earbuds", "buds"]],
  ] as const;
  return rules.find(([, words]) =>
    words.some((word) => source.includes(word)),
  )?.[0];
}

function generateSku(name: string, storage: string, color: string) {
  const base = quickProductSlug(
    [name, storage, color].filter(Boolean).join(" "),
  )
    .replaceAll("-", "")
    .toUpperCase()
    .slice(0, 28);
  return `${base || "URUN"}-${Date.now().toString(36).toUpperCase()}`;
}

export function parseQuickProduct(
  input: string,
  brands: AdminProductReference[],
  categories: AdminProductReference[],
): QuickProductDraft {
  const source = input.trim().replace(/\s+/g, " ");
  const segments = source
    .split(/[/|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const brand = findReference(source, brands);
  const moneySegments = segments.filter((item) => /(?:₺|\btl\b)/i.test(item));
  const price = parseMoney(moneySegments.at(-1) ?? "");
  const oldPrice =
    moneySegments.length > 1 ? parseMoney(moneySegments[0]) : null;
  const ramMatch = source.match(/\b(\d+)\s*(GB|TB)\s*RAM\b/i);
  const storageMatches = [...source.matchAll(/\b(\d+)\s*(GB|TB)\b/gi)].filter(
    (match) =>
      !/RAM/i.test(
        source.slice(match.index, match.index + match[0].length + 5),
      ),
  );
  const storageMatch = storageMatches.at(-1);
  const storageValue = storageMatch ? Number(storageMatch[1]) : null;
  const storageUnit = storageMatch
    ? (storageMatch[2].toUpperCase() as "GB" | "TB")
    : null;
  const recognized = (segment: string) =>
    /(?:₺|\btl\b)/i.test(segment) ||
    /\b\d+\s*(?:GB|TB)(?:\s*RAM)?\b/i.test(segment);
  const name = segments.find((segment) => !recognized(segment)) ?? source;
  const color =
    segments.find(
      (segment, index) => index > 0 && !recognized(segment) && segment !== name,
    ) ?? "";
  const categoryHint = categoryKeywords(normalized(source));
  const category = categoryHint
    ? findReference(categoryHint, categories)
    : null;
  const storageLabel =
    storageValue && storageUnit ? `${storageValue} ${storageUnit}` : "";
  const details = [
    brand?.name ? `Marka: ${brand.name}` : "",
    ramMatch ? `RAM: ${ramMatch[1]} ${ramMatch[2].toUpperCase()}` : "",
    storageLabel ? `Depolama: ${storageLabel}` : "",
    color ? `Renk: ${color}` : "",
  ].filter(Boolean);

  return {
    name,
    slug: quickProductSlug(name),
    sku: generateSku(name, storageLabel, color),
    brandId: brand?.id ?? "",
    categoryId: category?.id ?? "",
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
    stock: 25,
    warrantyMonths: 24,
    color,
    storageValue,
    storageUnit,
    ram: ramMatch ? `${ramMatch[1]} ${ramMatch[2].toUpperCase()}` : "",
    description: `<p>${name} için temel ürün bilgileri hızlı ürün oluşturma alanında hazırlanmıştır.</p>${
      details.length
        ? `<ul>${details.map((detail) => `<li>${detail}</li>`).join("")}</ul>`
        : ""
    }`,
  };
}
