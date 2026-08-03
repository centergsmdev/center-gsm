import type { AdminProductResult } from "@/types/admin-product";

const SAFE_ERROR = "Görsel adresinden dosya alınamadı.";

export async function downloadRemoteImage(
  url: string,
  purpose: "product" | "content" = "product",
): Promise<AdminProductResult<File>> {
  try {
    const response = await fetch("/api/admin/remote-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), purpose }),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      const result = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : null;
      return { data: null, error: result?.error ?? SAFE_ERROR };
    }
    if (!contentType.startsWith("image/"))
      return { data: null, error: "Adres geçerli bir görsel döndürmedi." };
    const blob = await response.blob();
    const fileName =
      decodeURIComponent(response.headers.get("x-image-filename") ?? "") ||
      `url-gorseli.${extensionForType(contentType)}`;
    return {
      data: new File([blob], fileName, { type: contentType }),
      error: null,
    };
  } catch {
    return { data: null, error: SAFE_ERROR };
  }
}

function extensionForType(type: string) {
  if (type.startsWith("image/png")) return "png";
  if (type.startsWith("image/webp")) return "webp";
  return "jpg";
}
