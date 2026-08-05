export function productPath(slug: string) {
  return `/urun/${encodeURIComponent(slug.trim())}`;
}
