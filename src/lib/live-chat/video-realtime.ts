"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createCallRealtimeClient(participantToken: string) {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.anonKey, {
    accessToken: async () => participantToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sendPrivateSignal(
  channel: RealtimeChannel,
  event: string,
  payload: unknown,
) {
  return channel.send({ type: "broadcast", event, payload });
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
