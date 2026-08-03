import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REDIRECTS = 3;
const PRODUCT_LIMIT = 5 * 1024 * 1024;
const CONTENT_LIMIT = 4 * 1024 * 1024;

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const db = await createClient();
  if (!db) return errorResponse("Supabase bağlantısı yapılandırılmamış.", 503);
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return errorResponse("Bu işlem için admin yetkisi gerekiyor.", 403);

  let body: { url?: unknown; purpose?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("Görsel adresi okunamadı.", 400);
  }
  if (typeof body.url !== "string" || !body.url.trim())
    return errorResponse("Geçerli bir görsel adresi girin.", 400);

  const limit = body.purpose === "content" ? CONTENT_LIMIT : PRODUCT_LIMIT;
  try {
    const result = await fetchPublicImage(body.url.trim(), limit);
    return new Response(result.buffer, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.buffer.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Image-Filename": encodeURIComponent(result.fileName),
      },
    });
  } catch (error) {
    const message =
      error instanceof RemoteImageError
        ? error.message
        : "Görsel adresinden dosya alınamadı.";
    const status = error instanceof RemoteImageError ? error.status : 422;
    return errorResponse(message, status);
  }
}

async function fetchPublicImage(initialUrl: string, limit: number) {
  let url = parsePublicUrl(initialUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicHost(url.hostname);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "User-Agent": "CENTER-GSM-Image-Importer/1.0",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS)
        throw new RemoteImageError(
          "Görsel adresi çok fazla yönlendirme yaptı.",
          422,
        );
      url = parsePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok)
      throw new RemoteImageError(
        `Görsel sunucusu isteği kabul etmedi (HTTP ${response.status}).`,
        422,
      );
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ACCEPTED_TYPES.has(contentType))
      throw new RemoteImageError(
        "Adres JPEG, PNG veya WebP biçiminde bir görsel döndürmelidir.",
        415,
      );
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > limit)
      throw new RemoteImageError(
        `Görsel boyutu ${limit / 1024 / 1024} MB sınırını aşıyor.`,
        413,
      );
    const buffer = await readLimitedBody(response, limit);
    const metadata = await sharp(buffer).metadata();
    const expectedFormat =
      contentType === "image/jpeg"
        ? "jpeg"
        : contentType === "image/png"
          ? "png"
          : "webp";
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height
    )
      throw new RemoteImageError(
        "Adres geçerli bir görsel dosyası döndürmedi.",
        422,
      );
    return {
      buffer,
      contentType,
      fileName: fileNameFromUrl(url, contentType),
    };
  }
  throw new RemoteImageError("Görsel adresinden dosya alınamadı.", 422);
}

function parsePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RemoteImageError(
      "Geçerli bir HTTP veya HTTPS adresi girin.",
      400,
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new RemoteImageError(
      "Yalnızca herkese açık HTTP veya HTTPS adresleri kullanılabilir.",
      400,
    );
  if (url.port && !["80", "443"].includes(url.port))
    throw new RemoteImageError(
      "Görsel adresi standart bir web portu kullanmalıdır.",
      400,
    );
  return url;
}

async function assertPublicHost(hostname: string) {
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  )
    throw new RemoteImageError(
      "Yerel veya özel ağ adreslerinden görsel alınamaz.",
      400,
    );
}

function isPrivateAddress(address: string) {
  const value = address.toLowerCase();
  if (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  )
    return true;
  const ipv4 = value.startsWith("::ffff:") ? value.slice(7) : value;
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return false;
  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

async function readLimitedBody(response: Response, limit: number) {
  if (!response.body)
    throw new RemoteImageError("Görsel yanıtı boş geldi.", 422);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new RemoteImageError(
        `Görsel boyutu ${limit / 1024 / 1024} MB sınırını aşıyor.`,
        413,
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function fileNameFromUrl(url: URL, contentType: string) {
  const raw = decodeURIComponent(url.pathname.split("/").pop() ?? "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 80);
  if (raw && /\.(?:jpe?g|png|webp)$/i.test(raw)) return raw;
  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";
  return `${raw || "url-gorseli"}.${extension}`;
}

class RemoteImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
