import { createDecipheriv, createHash } from "crypto";
import type { BoardAction } from "../../domain/models.ts";
import { feishuCardActionSchema, feishuChallengeSchema } from "../validation.ts";

export interface NormalizedFeishuCardAction {
  taskId: string;
  action: Exclude<BoardAction, "create_task">;
  openId?: string;
  memberId?: string;
  note: string;
  /** Block reason from Card 2.0 inline form */
  blockReason?: string;
}

export interface FeishuMessageEvent {
  eventType: "im.message.receive_v1";
  messageId: string;
  chatId: string;
  chatType: "p2p" | "group";
  senderId: string;      // open_id of sender
  senderName?: string;
  text: string;
  mentionedBot: boolean;
}

// ===== Encrypt Key decryption =====
// Feishu encrypts event payloads when FEISHU_ENCRYPT_KEY is configured.
// This should be enabled in production.

export function decryptFeishuEvent(
  encryptedBody: { encrypt: string },
  encryptKey = process.env.FEISHU_ENCRYPT_KEY || ""
): unknown {
  if (!encryptKey) throw new Error("FEISHU_ENCRYPT_KEY not configured.");

  // Key derivation: SHA256 of the key string
  const keyBuf = createHash("sha256").update(encryptKey).digest();

  const cipherBuf = Buffer.from(encryptedBody.encrypt, "base64");
  const iv = cipherBuf.subarray(0, 16);
  const data = cipherBuf.subarray(16);

  const decipher = createDecipheriv("aes-256-cbc", keyBuf, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf-8");
  return JSON.parse(decrypted) as unknown;
}

// ===== Challenge response =====
export function resolveFeishuChallenge(
  body: unknown,
  verificationToken = process.env.FEISHU_VERIFICATION_TOKEN || ""
): { challenge: string } | null {
  const parsed = feishuChallengeSchema.safeParse(body);
  if (!parsed.success || !parsed.data.challenge) return null;
  if (verificationToken && parsed.data.token !== verificationToken) {
    throw new Error("Invalid Feishu verification token.");
  }
  return { challenge: parsed.data.challenge };
}

// ===== Deduplication =====
// Feishu may replay events. Track processed event IDs (in-memory for now).
const _processedEventIds = new Set<string>();
const MAX_DEDUP_SIZE = 500;

export function isEventAlreadyProcessed(eventId: string): boolean {
  return _processedEventIds.has(eventId);
}

export function markEventProcessed(eventId: string): void {
  if (_processedEventIds.size >= MAX_DEDUP_SIZE) {
    // Evict oldest entries (simple LRU approximation: clear when full)
    _processedEventIds.clear();
  }
  _processedEventIds.add(eventId);
}

// ===== Normalize card action =====
export function normalizeFeishuCardAction(body: unknown): NormalizedFeishuCardAction {
  const parsed = feishuCardActionSchema.parse(body);
  const value = parsed.action?.value || {};
  if (!value.taskId || !value.action) {
    throw new Error("Feishu card action is missing taskId or action.");
  }

  // Extract form field values (Card 2.0 inline form)
  const formValues = (parsed as Record<string, unknown>).form_value as Record<string, string> | undefined;

  return {
    taskId: value.taskId,
    action: value.action as Exclude<BoardAction, "create_task">,
    memberId: value.memberId,
    openId: parsed.operator?.open_id,
    note: value.note || "",
    blockReason: formValues?.block_reason
  };
}

// ===== Normalize message event =====
// Handles im.message.receive_v1 events
export function normalizeMessageEvent(body: unknown): FeishuMessageEvent | null {
  const b = body as Record<string, unknown>;
  const header = b.header as Record<string, unknown> | undefined;
  const event = b.event as Record<string, unknown> | undefined;

  if (header?.event_type !== "im.message.receive_v1" || !event) return null;

  const msg = event.message as Record<string, unknown> | undefined;
  if (!msg) return null;

  // Parse text content
  let text = "";
  try {
    const contentStr = msg.content as string;
    const content = JSON.parse(contentStr) as { text?: string };
    text = content.text ?? "";
    // Strip @mentions (format: @_user_... or @<open_id>)
    text = text.replace(/@\S+/g, "").trim();
  } catch {
    return null;
  }

  // Check if bot was mentioned
  const mentions = (event.mentions as Array<Record<string, unknown>>) ?? [];
  const botAppId = process.env.FEISHU_APP_ID || "";
  const mentionedBot = mentions.some((m) => m.app_id === botAppId || m.key === "@_all" || m.id_type === "app");

  const senderInfo = event.sender as Record<string, unknown> | undefined;
  const senderId = (senderInfo?.sender_id as Record<string, unknown>)?.open_id as string ?? "";

  return {
    eventType: "im.message.receive_v1",
    messageId: msg.message_id as string ?? "",
    chatId: msg.chat_id as string ?? "",
    chatType: msg.chat_type as "p2p" | "group",
    senderId,
    text,
    mentionedBot
  };
}

// ===== Card action toast response =====
export function buildCardActionToast(message: string, type: "success" | "error" = "success"): Record<string, unknown> {
  return { toast: { type, content: message } };
}
