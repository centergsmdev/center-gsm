import { NextResponse } from "next/server";

import {
  createVisitorChatClient,
  isLiveChatToken,
} from "@/lib/live-chat/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Geçersiz dosya isteği.");
  }
  const token = String(form.get("token") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const caption = String(form.get("message") ?? "").trim();
  const file = form.get("file");
  if (!isLiveChatToken(token)) return error("Geçersiz sohbet anahtarı.");
  if (name.length < 2 || name.length > 80)
    return error("Ad alanı 2–80 karakter olmalıdır.");
  if (!(file instanceof File)) return error("Bir görsel seçmelisiniz.");
  if (!ALLOWED_TYPES.has(file.type))
    return error("Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.");
  if (file.size > MAX_SIZE) return error("Görsel en fazla 5 MB olabilir.");
  if (caption.length > 2000)
    return error("Mesaj en fazla 2000 karakter olabilir.");

  const client = createVisitorChatClient(token);
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);
  let conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (!conversation.data) {
    conversation = await client
      .from("live_chat_conversations")
      .insert({ visitor_token: token, customer_name: name })
      .select("*")
      .single();
  }
  if (conversation.error || !conversation.data)
    return error("Sohbet başlatılamadı.", 500);

  const extension =
    file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${token}/${crypto.randomUUID()}.${extension}`;
  const uploaded = await client.storage
    .from("live-chat-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) return error("Görsel yüklenemedi.", 500);

  const sent = await client
    .from("live_chat_messages")
    .insert({
      conversation_id: conversation.data.id,
      sender: "customer",
      body: caption || "Görsel gönderildi.",
      attachment_path: path,
      attachment_name: file.name.slice(0, 180),
      attachment_mime: file.type,
    })
    .select("*")
    .single();
  if (sent.error) {
    await client.storage.from("live-chat-images").remove([path]);
    return error("Görsel mesajı gönderilemedi.", 500);
  }
  const signed = await client.storage
    .from("live-chat-images")
    .createSignedUrl(path, 3600);
  return NextResponse.json({
    conversation: conversation.data,
    message: { ...sent.data, attachment_url: signed.data?.signedUrl ?? null },
  });
}
