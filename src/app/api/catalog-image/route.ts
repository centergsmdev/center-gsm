import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

function isAllowedSource(source: URL) {
  if (source.protocol !== "https:") return false;

  const configuredHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();

  return Boolean(configuredHost && source.hostname === configuredHost);
}

export async function GET(request: NextRequest) {
  const rawSource = request.nextUrl.searchParams.get("url");
  if (!rawSource) {
    return NextResponse.json(
      { error: "Görsel adresi eksik." },
      { status: 400 },
    );
  }

  let source: URL;
  try {
    source = new URL(rawSource);
  } catch {
    return NextResponse.json(
      { error: "Görsel adresi geçersiz." },
      { status: 400 },
    );
  }

  if (!isAllowedSource(source)) {
    return NextResponse.json(
      { error: "Görsel kaynağına izin verilmiyor." },
      { status: 403 },
    );
  }

  try {
    const response = await fetch(source, {
      headers: { Accept: "image/*" },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Görsel çok büyük." }, { status: 413 });
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    if (sourceBuffer.byteLength > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Görsel çok büyük." }, { status: 413 });
    }

    const jpeg = await sharp(sourceBuffer, { failOn: "error" })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(720, 720, {
        fit: "contain",
        background: "#ffffff",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Görsel hazırlanamadı." },
      { status: 502 },
    );
  }
}
