import type { FeishuCard } from "./cards";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  defaultChatId?: string;
}

export interface SendCardInput {
  receiveIdType: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  receiveId: string;
  card: FeishuCard;
  /** Idempotency key — prevents duplicate messages on retry */
  uuid?: string;
}

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

// ===== Token cache (valid for 7200s, refresh 60s before expiry) =====
const _tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function getFeishuConfig(): FeishuConfig {
  return {
    appId: process.env.FEISHU_APP_ID || "",
    appSecret: process.env.FEISHU_APP_SECRET || "",
    defaultChatId: process.env.FEISHU_DEFAULT_CHAT_ID || ""
  };
}

export function isFeishuConfigured(config = getFeishuConfig()): boolean {
  return Boolean(config.appId && config.appSecret);
}

export async function getTenantAccessToken(config = getFeishuConfig()): Promise<string> {
  if (!isFeishuConfigured(config)) {
    throw new Error("Feishu app credentials are not configured.");
  }

  // Use cached token if still valid (with 60s buffer)
  const cacheKey = config.appId;
  const cached = _tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const response = await fetch(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret })
  });
  const json = (await response.json()) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (!response.ok || json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`Failed to get tenant access token: ${json.msg || response.statusText}`);
  }

  const ttl = (json.expire ?? 7200) * 1000;
  _tokenCache.set(cacheKey, { token: json.tenant_access_token, expiresAt: Date.now() + ttl });
  return json.tenant_access_token;
}

export async function sendInteractiveCard(
  input: SendCardInput,
  config = getFeishuConfig()
): Promise<{ skipped: boolean; messageId?: string; response?: unknown; preview?: unknown }> {
  if (!isFeishuConfigured(config)) {
    return {
      skipped: true,
      preview: {
        receive_id_type: input.receiveIdType,
        receive_id: input.receiveId,
        msg_type: "interactive",
        content: JSON.stringify(input.card)
      }
    };
  }

  const token = await getTenantAccessToken(config);
  const uuid = input.uuid ?? crypto.randomUUID();

  const response = await fetch(
    `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${input.receiveIdType}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: input.receiveId,
        msg_type: "interactive",
        content: JSON.stringify(input.card),
        uuid
      })
    }
  );

  const json = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: { message_id?: string };
  };
  if (!response.ok || (json.code !== undefined && json.code !== 0)) {
    throw new Error(`Failed to send Feishu card: ${json.msg || response.statusText}`);
  }
  return { skipped: false, messageId: json.data?.message_id, response: json };
}

/**
 * Update an already-sent interactive card in-place.
 * Call this after task status changes so the card in the chat reflects the new state.
 *
 * API: PATCH /open-apis/im/v1/messages/{message_id}/patch
 */
export async function patchInteractiveCard(
  messageId: string,
  card: FeishuCard,
  config = getFeishuConfig()
): Promise<{ skipped: boolean }> {
  if (!isFeishuConfigured(config) || !messageId) return { skipped: true };

  const token = await getTenantAccessToken(config);
  const response = await fetch(`${FEISHU_BASE_URL}/im/v1/messages/${messageId}/patch`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ content: JSON.stringify(card) })
  });

  if (!response.ok) {
    const json = (await response.json()) as { msg?: string };
    throw new Error(`Failed to patch Feishu card: ${json.msg || response.statusText}`);
  }
  return { skipped: false };
}

/**
 * Send a plain text message via bot (for @ reply or simple notification)
 * API: POST /open-apis/im/v1/messages?receive_id_type=open_id
 */
export async function sendTextMessage(
  receiveIdType: SendCardInput["receiveIdType"],
  receiveId: string,
  text: string,
  config = getFeishuConfig()
): Promise<{ skipped: boolean; messageId?: string }> {
  if (!isFeishuConfigured(config)) return { skipped: true };

  const token = await getTenantAccessToken(config);
  const response = await fetch(
    `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "text",
        content: JSON.stringify({ text }),
        uuid: crypto.randomUUID()
      })
    }
  );
  const json = (await response.json()) as { data?: { message_id?: string } };
  return { skipped: false, messageId: json.data?.message_id };
}

/**
 * Pin a message to a chat (e.g. pin the daily digest card).
 * API: POST /open-apis/im/v1/pins
 * Permission: im:message.pin (write)
 */
export async function pinMessage(
  messageId: string,
  config = getFeishuConfig()
): Promise<{ skipped: boolean }> {
  if (!isFeishuConfigured(config) || !messageId) return { skipped: true };

  const token = await getTenantAccessToken(config);
  const response = await fetch(`${FEISHU_BASE_URL}/im/v1/pins`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ message_id: messageId })
  });
  if (!response.ok) {
    const json = (await response.json()) as { msg?: string };
    console.warn("[feishu] pinMessage failed:", json.msg);
  }
  return { skipped: false };
}

/**
 * Add a reaction to a message (e.g. ✅ when a task is completed).
 * API: POST /open-apis/im/v1/messages/{message_id}/reactions
 * Permission: im:message.reaction (write)
 */
export async function addMessageReaction(
  messageId: string,
  emojiType: string,  // e.g. "THUMBSUP", "OK", "CHECKMARK"
  config = getFeishuConfig()
): Promise<{ skipped: boolean }> {
  if (!isFeishuConfigured(config) || !messageId) return { skipped: true };

  const token = await getTenantAccessToken(config);
  const response = await fetch(`${FEISHU_BASE_URL}/im/v1/messages/${messageId}/reactions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ reaction_type: { emoji_type: emojiType } })
  });
  return { skipped: !response.ok };
}

/**
 * Get a user's presence/status from Feishu.
 * Useful for checking if an assignee is in a meeting before assigning.
 * API: GET /open-apis/presence/v1/user_presences?user_ids=ou_xxx
 * Permission: presence:user_presence:readonly
 */
export async function getUserPresence(
  openIds: string[],
  config = getFeishuConfig()
): Promise<Array<{ openId: string; status: "active" | "meeting" | "away" | "out_of_office" | "unknown" }>> {
  if (!isFeishuConfigured(config) || openIds.length === 0) return [];

  const token = await getTenantAccessToken(config);
  const ids = openIds.map((id) => `user_ids=${encodeURIComponent(id)}`).join("&");
  const response = await fetch(`${FEISHU_BASE_URL}/presence/v1/user_presences?${ids}&user_id_type=open_id`, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) return openIds.map((id) => ({ openId: id, status: "unknown" as const }));

  const json = (await response.json()) as {
    data?: {
      user_presences?: Array<{
        user_id?: string;
        status?: string;
      }>;
    };
  };

  return (json.data?.user_presences ?? []).map((p) => ({
    openId: p.user_id ?? "",
    status: (p.status as "active" | "meeting" | "away" | "out_of_office") ?? "unknown"
  }));
}

/**
 * Upload a file or image to Feishu file storage.
 * Returns a file_key that can be referenced in messages.
 * API: POST /open-apis/im/v1/files
 * Permission: im:resource (write)
 */
export async function uploadFile(
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: "opus" | "mp4" | "jpg" | "png" | "webp" | "gif" | "pdf" | "doc" | "xls" | "ppt" | "stream",
  config = getFeishuConfig()
): Promise<string | null> {
  if (!isFeishuConfigured(config)) return null;

  const token = await getTenantAccessToken(config);
  const form = new FormData();
  form.append("file_type", fileType);
  form.append("file_name", fileName);
  form.append("file", new Blob([fileBuffer]), fileName);

  const response = await fetch(`${FEISHU_BASE_URL}/im/v1/files`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form
  });

  const json = (await response.json()) as { data?: { file_key?: string } };
  return json.data?.file_key ?? null;
}
