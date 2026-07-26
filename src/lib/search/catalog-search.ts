import { catalogProducts } from "@/data/catalog-products";
import type {
  SearchDataSource,
  SearchSuggestion,
  SearchSuggestionGroups,
} from "@/types/search";

const recentSearches = [
  "Kablosuz kulaklık",
  "Nova X Pro",
  "Dizüstü bilgisayar",
];
const popularSearches = [
  "Akıllı telefon",
  "Oyuncu bilgisayarı",
  "Akıllı saat",
  "Tablet",
];

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

export function searchCatalogProducts(query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return catalogProducts;
  return catalogProducts.filter((product) =>
    normalize(
      [
        product.brand,
        product.model,
        product.description,
        product.category,
      ].join(" "),
    ).includes(normalizedQuery),
  );
}

function termSuggestions(
  terms: string[],
  kind: SearchSuggestion["kind"],
  query: string,
) {
  const normalizedQuery = normalize(query);
  return terms
    .filter(
      (term) => !normalizedQuery || normalize(term).includes(normalizedQuery),
    )
    .slice(0, 5)
    .map((term, index): SearchSuggestion => ({
      id: `${kind}-${index}-${term}`,
      kind,
      label: term,
      href: `/arama?q=${encodeURIComponent(term)}`,
    }));
}

export function getCatalogSuggestions(query: string): SearchSuggestionGroups {
  const productMatches = searchCatalogProducts(query).slice(0, 4);
  const brands = Array.from(
    new Set(catalogProducts.map((product) => product.brand)),
  );
  const categories = Array.from(
    new Set(catalogProducts.map((product) => product.category)),
  );
  return {
    products: productMatches.map((product) => ({
      id: `product-${product.id}`,
      kind: "product",
      label: `${product.brand} ${product.model}`,
      description: product.description,
      href: `/urun/${product.slug}`,
      product,
    })),
    brands: termSuggestions(brands, "brand", query),
    categories: termSuggestions(categories, "category", query),
    recent: termSuggestions(recentSearches, "recent", query),
    popular: termSuggestions(popularSearches, "popular", query),
  };
}

export const catalogSearchDataSource: SearchDataSource = {
  async suggestions(query) {
    return getCatalogSuggestions(query);
  },
  async products(query) {
    return searchCatalogProducts(query);
  },
};
