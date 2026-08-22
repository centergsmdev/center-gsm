import "server-only";

import { isUuid, isTemporarySessionToken } from "@/lib/live-chat/simli";

const SIMLI_API_URL = "https://api.simli.ai/compose/token";

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function getSimliServerConfig() {
  const apiKey = process.env.SIMLI_API_KEY?.trim() ?? "";
  const faceId = process.env.SIMLI_FACE_ID?.trim() ?? "";
  const enabled =
    process.env.SIMLI_POC_ENABLED?.trim().toLowerCase() === "true";
  return {
    enabled,
    configured: enabled && apiKey.length >= 8 && isUuid(faceId),
    apiKey,
    faceId,
    maxSessionSeconds: boundedInteger(
      process.env.SIMLI_MAX_SESSION_SECONDS,
      1200,
      60,
      3600,
    ),
    maxIdleSeconds: boundedInteger(
      process.env.SIMLI_MAX_IDLE_SECONDS,
      90,
      30,
      300,
    ),
  };
}

export function publicSimliConfig() {
  const config = getSimliServerConfig();
  return {
    simliPocEnabled: config.enabled,
    simliConfigured: config.configured,
  };
}

export async function createSimliSessionToken(input: {
  maxDurationSeconds: number;
  fetcher?: typeof fetch;
}) {
  const config = getSimliServerConfig();
  if (!config.configured) throw new Error("simli_not_configured");
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(SIMLI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-simli-api-key": config.apiKey,
    },
    body: JSON.stringify({
      faceId: config.faceId,
      handleSilence: false,
      maxSessionLength: Math.min(
        config.maxSessionSeconds,
        Math.max(60, input.maxDurationSeconds),
      ),
      maxIdleTime: config.maxIdleSeconds,
      model: "fasttalk",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("simli_token_request_failed");
  const data = (await response.json()) as { session_token?: unknown };
  if (!isTemporarySessionToken(data.session_token))
    throw new Error("simli_invalid_token_response");
  return data.session_token;
}
