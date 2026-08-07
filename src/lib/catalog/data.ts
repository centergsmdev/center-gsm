import { catalogProducts } from "@/data/catalog-products";
import { mapSupabaseProduct } from "@/lib/catalog/mapper";
import { applyDefaultVariantPresentation } from "@/lib/catalog/variants";
import type {
  BrandTaxonomy,
  CatalogCollectionResult,
  CatalogFilters,
  CatalogItemResult,
  CatalogListResult,
  CatalogTaxonomy,
  SupabaseCatalogRow,
} from "@/lib/catalog/types";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { normalizeSearchTerm } from "@/lib/search/normalize-search";
import {
  loadSmartSearchIndex,
  smartProductIds,
  smartSearchScore,
} from "@/lib/search/smart-search";
import type { Tables } from "@/types/database";
import type { CatalogProduct } from "@/types/product";

const DEFAULT_PAGE_SIZE = 8;
type CatalogClient = NonNullable<ReturnType<typeof createClient>>;

function resolveProductSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function fallbackProducts(filters: CatalogFilters): CatalogListResult {
  let data = [...catalogProducts];
  const query = normalizeSearchTerm(filters.query ?? "");
  if (query)
    data = data.filter((product) =>
      Boolean(
        smartSearchScore(
          query,
          [
            product.brand,
            product.model,
            product.description,
            product.shortDescription,
            product.category,
            product.sku,
            ...(product.colors ?? []).flatMap((color) => [
              color.name,
              color.displayName,
            ]),
            ...(product.variants ?? []).flatMap((variant) => [
              variant.name,
              variant.variantTitle,
              variant.sku,
              variant.barcode,
              variant.storageValue,
              variant.storageValue && variant.storageUnit
                ? `${variant.storageValue} ${variant.storageUnit}`
                : null,
            ]),
          ]
            .filter(Boolean)
            .join(" "),
        ),
      ),
    );
  if (filters.categories?.length)
    data = data.filter((product) =>
      filters.categories?.some(
        (category) =>
          category ===
            product.category
              .toLocaleLowerCase("tr-TR")
              .replaceAll("ı", "i")
              .replaceAll(" ", "-") || category === product.category,
      ),
    );
  if (filters.brands?.length)
    data = data.filter((product) =>
      filters.brands?.some(
        (brand) =>
          brand.toLocaleLowerCase("tr-TR") ===
          product.brand.toLocaleLowerCase("tr-TR"),
      ),
    );
  if (filters.minPrice !== undefined)
    data = data.filter((product) => product.price >= filters.minPrice!);
  if (filters.maxPrice !== undefined)
    data = data.filter((product) => product.price <= filters.maxPrice!);
  if (filters.stock)
    data = data.filter((product) => product.stockStatus !== "out-of-stock");
  if (filters.discount)
    data = data.filter((product) => Boolean(product.discountRate));
  if (filters.featured)
    data = data.filter((product) =>
      ["p-001", "p-002", "p-003", "p-004"].includes(product.id),
    );
  if (filters.weeklyDeal)
    data = data.filter((product) => Boolean(product.discountRate));
  if (filters.latestPhone)
    data = data.filter(
      (product) => product.category.toLocaleLowerCase("tr-TR") === "telefon",
    );
  if (filters.sort === "price-asc") data.sort((a, b) => a.price - b.price);
  else if (filters.sort === "price-desc")
    data.sort((a, b) => b.price - a.price);
  else if (filters.sort === "newest") data.reverse();
  else
    data.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
  const total = data.length;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = filters.page ?? 1;
  return {
    data: data.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    error: false,
    source: "fallback",
  };
}

async function hydrateProducts(
  client: CatalogClient,
  products: Tables<"products">[],
): Promise<SupabaseCatalogRow[] | null> {
  if (!products.length) return [];
  const productIds = products.map((product) => product.id);
  const categoryIds = [
    ...new Set(products.map((product) => product.category_id)),
  ];
  const brandIds = [...new Set(products.map((product) => product.brand_id))];
  const [
    categoriesResult,
    brandsResult,
    imagesResult,
    variantsResult,
    colorsResult,
    stockResult,
  ] = await Promise.all([
    client.from("categories").select("*").in("id", categoryIds),
    client.from("brands").select("*").in("id", brandIds),
    client
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
    client
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    client
      .from("product_colors")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("product_available_stock")
      .select("*")
      .in("product_id", productIds),
  ]);
  if (
    categoriesResult.error ||
    brandsResult.error ||
    imagesResult.error ||
    variantsResult.error ||
    colorsResult.error ||
    stockResult.error
  )
    return null;
  const categories = new Map(
    categoriesResult.data.map((item) => [item.id, item]),
  );
  const brands = new Map(brandsResult.data.map((item) => [item.id, item]));
  return products.flatMap((product) => {
    const category = categories.get(product.category_id);
    const brand = brands.get(product.brand_id);
    if (!category || !brand) return [];
    return [
      {
        ...product,
        availableStock:
          stockResult.data.find((item) => item.product_id === product.id)
            ?.available_stock ?? 0,
        category,
        brand,
        images: imagesResult.data.filter(
          (image) => image.product_id === product.id,
        ),
        colors: colorsResult.data.filter(
          (color) => color.product_id === product.id,
        ),
        variants: variantsResult.data.filter(
          (variant) => variant.product_id === product.id,
        ),
      },
    ];
  });
}

async function taxonomyIds(
  client: CatalogClient,
  table: "categories" | "brands",
  slugs: string[] | undefined,
) {
  if (!slugs?.length) return null;
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()))].filter(
    Boolean,
  );
  if (!uniqueSlugs.length) return null;
  const requestedSlugs = new Set(
    uniqueSlugs.map((slug) => slug.toLocaleLowerCase("tr-TR")),
  );
  const { data, error } = await client
    .from(table)
    .select("id,slug")
    .eq("is_active", true);
  return error
    ? undefined
    : data
        .filter((item) =>
          requestedSlugs.has(item.slug.trim().toLocaleLowerCase("tr-TR")),
        )
        .map((item) => item.id);
}

export async function getProducts(
  filters: CatalogFilters = {},
): Promise<CatalogListResult> {
  const client = createClient();
  if (!client) return fallbackProducts(filters);
  try {
    const categoryIds = await taxonomyIds(
      client,
      "categories",
      filters.categories,
    );
    const brandIds = await taxonomyIds(client, "brands", filters.brands);
    if (categoryIds === undefined || brandIds === undefined)
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
        error: true,
        source: "supabase",
      };
    if (categoryIds?.length === 0 || brandIds?.length === 0)
      return {
        data: [],
        total: 0,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
        error: false,
        source: "supabase",
      };
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(
      48,
      Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const safeQuery = normalizeSearchTerm(filters.query ?? "");
    let matchedProductIds: string[] | null = null;
    if (safeQuery) {
      const searchIndex = await loadSmartSearchIndex(client);
      if (!searchIndex)
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          error: true,
          source: "supabase",
        };
      matchedProductIds = smartProductIds(searchIndex, safeQuery).slice(0, 500);
      if (!matchedProductIds.length)
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          error: false,
          source: "supabase",
        };
    }
    let query = client
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true);
    if (categoryIds) query = query.in("category_id", categoryIds);
    if (brandIds) query = query.in("brand_id", brandIds);
    if (filters.minPrice !== undefined)
      query = query.gte("price", filters.minPrice);
    if (filters.maxPrice !== undefined)
      query = query.lte("price", filters.maxPrice);
    if (filters.stock) query = query.gt("stock_quantity", 0);
    if (filters.discount) query = query.not("old_price", "is", null);
    if (filters.featured) query = query.eq("is_featured", true);
    if (filters.weeklyDeal) query = query.eq("is_weekly_deal", true);
    if (filters.latestPhone) query = query.eq("is_latest_phone", true);
    if (matchedProductIds) query = query.in("id", matchedProductIds);
    if (filters.sort === "price-asc")
      query = query.order("price", { ascending: true });
    else if (filters.sort === "price-desc")
      query = query.order("price", { ascending: false });
    else if (filters.sort === "newest")
      query = query.order("created_at", { ascending: false });
    else
      query = query
        .order("review_count", { ascending: false })
        .order("rating", { ascending: false });
    const { data, error, count } = await query.range(
      (page - 1) * pageSize,
      page * pageSize - 1,
    );
    if (error)
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: true,
        source: "supabase",
      };
    const rows = await hydrateProducts(client, data);
    if (!rows)
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: true,
        source: "supabase",
      };
    return {
      data: rows.map(mapSupabaseProduct),
      total: count ?? rows.length,
      page,
      pageSize,
      error: false,
      source: "supabase",
    };
  } catch {
    return {
      data: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
      error: true,
      source: "supabase",
    };
  }
}

export async function getFeaturedProducts(limit = 4) {
  return getProducts({ featured: true, sort: "popular", pageSize: limit });
}

export async function getCampaignProducts({
  page = 1,
  pageSize = 20,
  minimumDiscountRate = 18,
}: {
  page?: number;
  pageSize?: number;
  minimumDiscountRate?: number;
} = {}): Promise<CatalogListResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(48, Math.max(1, pageSize));
  const client = createClient();

  if (!client) {
    const eligibleProducts = catalogProducts
      .map((product) => applyDefaultVariantPresentation(product))
      .filter(
        (product) =>
          product.discountRate !== undefined &&
          product.discountRate >= minimumDiscountRate,
      )
      .sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));

    return {
      data: eligibleProducts.slice(
        (safePage - 1) * safePageSize,
        safePage * safePageSize,
      ),
      total: eligibleProducts.length,
      page: safePage,
      pageSize: safePageSize,
      error: false,
      source: "fallback",
    };
  }

  try {
    const products: Tables<"products">[] = [];
    const batchSize = 500;

    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      products.push(...data);
      if (data.length < batchSize) break;
    }

    const hydratedRows: SupabaseCatalogRow[] = [];
    for (let offset = 0; offset < products.length; offset += 100) {
      const rows = await hydrateProducts(
        client,
        products.slice(offset, offset + 100),
      );
      if (!rows) throw new Error("Campaign products could not be hydrated.");
      hydratedRows.push(...rows);
    }

    const eligibleProducts = hydratedRows
      .map(mapSupabaseProduct)
      .filter(
        (product) =>
          product.discountRate !== undefined &&
          product.discountRate >= minimumDiscountRate,
      )
      .sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));

    return {
      data: eligibleProducts.slice(
        (safePage - 1) * safePageSize,
        safePage * safePageSize,
      ),
      total: eligibleProducts.length,
      page: safePage,
      pageSize: safePageSize,
      error: false,
      source: "supabase",
    };
  } catch {
    return {
      data: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      error: true,
      source: "supabase",
    };
  }
}
export async function searchProducts(
  query: string,
  filters: Omit<CatalogFilters, "query"> = {},
) {
  return getProducts({ ...filters, query });
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogItemResult> {
  const resolvedSlug = resolveProductSlug(slug);
  const client = createClient();
  if (!client)
    return {
      data:
        catalogProducts.find((product) => product.slug === resolvedSlug) ??
        null,
      error: false,
      source: "fallback",
    };
  try {
    const exactResult = await client
      .from("products")
      .select("*")
      .eq("slug", resolvedSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (exactResult.error)
      return { data: null, error: true, source: "supabase" };
    let product = exactResult.data;
    if (!product) {
      const candidates = await client
        .from("products")
        .select("id,slug")
        .eq("is_active", true);
      if (candidates.error)
        return { data: null, error: true, source: "supabase" };
      const normalizedSlug = resolvedSlug.toLocaleLowerCase("tr-TR");
      const match = candidates.data.find(
        (item) => item.slug.toLocaleLowerCase("tr-TR") === normalizedSlug,
      );
      if (!match) return { data: null, error: false, source: "supabase" };
      const matchedResult = await client
        .from("products")
        .select("*")
        .eq("id", match.id)
        .eq("is_active", true)
        .maybeSingle();
      if (matchedResult.error)
        return { data: null, error: true, source: "supabase" };
      product = matchedResult.data;
    }
    if (!product) return { data: null, error: false, source: "supabase" };
    const rows = await hydrateProducts(client, [product]);
    return rows
      ? {
          data: rows[0] ? mapSupabaseProduct(rows[0]) : null,
          error: false,
          source: "supabase",
        }
      : { data: null, error: true, source: "supabase" };
  } catch {
    return { data: null, error: true, source: "supabase" };
  }
}

export async function getCategories(): Promise<
  CatalogCollectionResult<CatalogTaxonomy>
> {
  const client = createClient();
  if (!client) {
    const names = [
      ...new Set(catalogProducts.map((product) => product.category)),
    ];
    return {
      data: names.map((name, index) => ({
        id: `fallback-category-${index}`,
        name,
        show_in_header: index < 7,
        slug: name
          .toLocaleLowerCase("tr-TR")
          .replaceAll("ı", "i")
          .replaceAll(" ", "-"),
      })),
      error: false,
      source: "fallback",
    };
  }
  try {
    const { data, error } = await client
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return {
      data: error ? [] : data,
      error: Boolean(error),
      source: "supabase",
    };
  } catch {
    return { data: [], error: true, source: "supabase" };
  }
}
export async function getBrands(): Promise<
  CatalogCollectionResult<BrandTaxonomy>
> {
  const client = createClient();
  if (!client) {
    const names = [...new Set(catalogProducts.map((product) => product.brand))];
    return {
      data: names.map((name, index) => ({
        id: `fallback-brand-${index}`,
        name,
        slug: name.toLocaleLowerCase("tr-TR"),
      })),
      error: false,
      source: "fallback",
    };
  }
  try {
    const { data, error } = await client
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");
    return {
      data: error ? [] : data,
      error: Boolean(error),
      source: "supabase",
    };
  } catch {
    return { data: [], error: true, source: "supabase" };
  }
}

export async function getRelatedProducts(
  product: CatalogProduct,
  limit = 4,
): Promise<CatalogListResult> {
  const categories = await getCategories();
  const category = categories.data.find(
    (item) => item.name === product.category,
  );
  const result = await getProducts({
    categories: category ? [category.slug] : undefined,
    pageSize: limit + 1,
    sort: "popular",
  });
  return {
    ...result,
    data: result.data
      .filter((item) => item.slug !== product.slug)
      .slice(0, limit),
  };
}
