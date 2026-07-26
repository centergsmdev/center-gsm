import type { CatalogProduct } from "@/types/product";

export type SearchSuggestionKind =
  "product" | "brand" | "category" | "recent" | "popular";

export type SearchSuggestion = {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  description?: string;
  href: string;
  product?: CatalogProduct;
};

export type SearchSuggestionGroups = {
  products: SearchSuggestion[];
  brands: SearchSuggestion[];
  categories: SearchSuggestion[];
  recent: SearchSuggestion[];
  popular: SearchSuggestion[];
};

export interface SearchDataSource {
  suggestions(query: string): Promise<SearchSuggestionGroups>;
  products(query: string): Promise<CatalogProduct[]>;
}
