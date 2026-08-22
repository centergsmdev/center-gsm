export type BlockPolicyIdentity = {
  visitorToken: string;
  userId: string | null;
  abuseTokenHash: string | null;
  ipHash: string | null;
  isAdmin: boolean;
};

export type BlockPolicyRecord = {
  id: string;
  scope: "chat" | "site";
  visitor_token: string | null;
  user_id: string | null;
  abuse_token_hash: string | null;
  ip_hash: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export type BlockMatchKind = "user" | "visitor" | "abuse_token" | "network";

export function blockMatchKind(
  block: BlockPolicyRecord,
  identity: BlockPolicyIdentity,
): BlockMatchKind | null {
  if (identity.userId && block.user_id === identity.userId) return "user";
  if (block.visitor_token === identity.visitorToken) return "visitor";
  if (
    identity.abuseTokenHash &&
    block.abuse_token_hash === identity.abuseTokenHash
  )
    return "abuse_token";
  if (identity.ipHash && block.ip_hash === identity.ipHash) return "network";
  return null;
}

export function selectMatchingBlock<T extends BlockPolicyRecord>(
  blocks: T[],
  identity: BlockPolicyIdentity,
  requestedScope: "chat" | "site" = "chat",
  now = Date.now(),
) {
  if (identity.isAdmin) return null;
  const priority: Record<BlockMatchKind, number> = {
    user: 40,
    visitor: 30,
    abuse_token: 20,
    network: 10,
  };
  return (
    blocks
      .flatMap((block) => {
        if (block.revoked_at) return [];
        if (block.expires_at && new Date(block.expires_at).getTime() <= now)
          return [];
        if (requestedScope === "site" && block.scope !== "site") return [];
        const matchedBy = blockMatchKind(block, identity);
        if (!matchedBy || (block.scope === "site" && matchedBy === "network"))
          return [];
        return [
          {
            block,
            matchedBy,
            priority: (block.scope === "site" ? 100 : 0) + priority[matchedBy],
          },
        ];
      })
      .sort((a, b) => b.priority - a.priority)[0] ?? null
  );
}

export function relatedSignalReasons(
  current: {
    visitor_token: string;
    user_id: string | null;
    abuse_token_hash: string | null;
    ip_hash: string | null;
    device_profile_hash: string | null;
  },
  candidate: typeof current,
) {
  const reasons: Array<
    "visitor" | "user" | "abuse_token" | "network" | "coarse_device"
  > = [];
  if (candidate.visitor_token === current.visitor_token)
    reasons.push("visitor");
  if (current.user_id && candidate.user_id === current.user_id)
    reasons.push("user");
  if (
    current.abuse_token_hash &&
    candidate.abuse_token_hash === current.abuse_token_hash
  )
    reasons.push("abuse_token");
  if (current.ip_hash && candidate.ip_hash === current.ip_hash)
    reasons.push("network");
  if (
    current.device_profile_hash &&
    candidate.device_profile_hash === current.device_profile_hash
  )
    reasons.push("coarse_device");
  return reasons;
}
