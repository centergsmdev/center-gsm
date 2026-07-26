import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
import type {
  Json,
  ReturnReason,
  ReturnStatus,
  Tables,
} from "@/types/database";
type Result<T> = { data: T | null; error: string | null };
const fail = <T>(
  message = "İade işlemi şu anda tamamlanamadı.",
): Result<T> => ({ data: null, error: message });
export async function createReturnRequest(input: {
  orderId: string;
  reason: ReturnReason;
  description: string;
  requestType: "return" | "exchange" | "warranty";
  items: { order_item_id: string; quantity: number }[];
}) {
  const db = createClient();
  if (!db) return fail<string>("Supabase yapılandırılmamış.");
  const r = await db.rpc("create_return_request", {
    p_order_id: input.orderId,
    p_reason: input.reason,
    p_description: input.description,
    p_items: input.items as unknown as Json,
    p_request_type: input.requestType,
  });
  return r.error ? fail<string>() : { data: r.data, error: null };
}
export async function getMyReturns(): Promise<
  Result<Tables<"return_requests">[]>
> {
  const db = createClient();
  if (!db) return fail();
  const r = await db
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return r.error ? fail() : { data: r.data, error: null };
}
export async function getAdminReturns(): Promise<
  Result<Tables<"return_requests">[]>
> {
  return getMyReturns();
}
type ReturnBundle = {
  request: Tables<"return_requests">;
  items: Tables<"return_request_items">[];
  messages: Tables<"return_messages">[];
  history: Tables<"return_status_history">[];
  attachments: Tables<"return_attachments">[];
};
export async function getReturnBundle(
  id: string,
): Promise<Result<ReturnBundle>> {
  const db = createClient();
  if (!db) return fail<ReturnBundle>();
  const [request, items, messages, history, attachments] = await Promise.all([
    db.from("return_requests").select("*").eq("id", id).single(),
    db.from("return_request_items").select("*").eq("return_request_id", id),
    db
      .from("return_messages")
      .select("*")
      .eq("return_request_id", id)
      .order("created_at"),
    db
      .from("return_status_history")
      .select("*")
      .eq("return_request_id", id)
      .order("created_at"),
    db
      .from("return_attachments")
      .select("*")
      .eq("return_request_id", id)
      .order("created_at"),
  ]);
  if (
    request.error ||
    items.error ||
    messages.error ||
    history.error ||
    attachments.error
  )
    return fail();
  return {
    data: {
      request: request.data,
      items: items.data,
      messages: messages.data,
      history: history.data,
      attachments: attachments.data,
    },
    error: null,
  };
}
export async function updateReturnStatus(
  id: string,
  status: ReturnStatus,
  internalNote: string,
  customerNote: string,
) {
  const db = createClient();
  if (!db) return fail<boolean>();
  const r = await db.rpc("update_return_status", {
    p_return_id: id,
    p_status: status,
    p_internal_note: internalNote || null,
    p_customer_note: customerNote || null,
  });
  return r.error ? fail<boolean>() : { data: r.data, error: null };
}
export async function addReturnMessage(
  id: string,
  message: string,
  isInternal = false,
) {
  const db = createClient();
  if (!db) return fail<string>();
  const r = await db.rpc("add_return_message", {
    p_return_id: id,
    p_message: message,
    p_is_internal: isInternal,
  });
  return r.error ? fail<string>() : { data: r.data, error: null };
}
export async function uploadReturnFiles(returnId: string, files: File[]) {
  const db = createClient();
  if (!db) return fail<string[]>();
  const user = (await authApi(db).getUser()).data.user;
  if (!user) return fail<string[]>();
  const paths: string[] = [];
  for (const file of files) {
    const safe = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${user.id}/${returnId}/${crypto.randomUUID()}-${safe}`;
    const upload = await db.storage
      .from("return-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) return fail<string[]>();
    const record = await db.rpc("register_return_attachment", {
      p_return_id: returnId,
      p_storage_path: path,
      p_file_name: file.name,
      p_mime_type: file.type,
      p_file_size: file.size,
      p_message_id: null,
    });
    if (record.error) {
      await db.storage.from("return-attachments").remove([path]);
      return fail<string[]>();
    }
    paths.push(path);
  }
  return { data: paths, error: null };
}
