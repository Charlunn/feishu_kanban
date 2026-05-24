import { NextResponse } from "next/server";
import {
  resolveFeishuChallenge,
  decryptFeishuEvent,
  normalizeMessageEvent,
  isEventAlreadyProcessed,
  markEventProcessed
} from "@/lib/feishu/events";
import { getKanbanStore } from "@/lib/store";
import { createTask, approveDone } from "@/domain/operations";
import { buildAtReplyCard } from "@/lib/feishu/cards";
import { sendInteractiveCard, isFeishuConfigured } from "@/lib/feishu/client";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // ===== Decrypt if Encrypt Key is set =====
    let body: unknown = rawBody;
    const encryptKey = process.env.FEISHU_ENCRYPT_KEY;
    if (encryptKey && rawBody && typeof rawBody === "object" && "encrypt" in rawBody) {
      try {
        body = decryptFeishuEvent(rawBody as { encrypt: string }, encryptKey);
      } catch {
        return NextResponse.json({ error: "Decryption failed. Check FEISHU_ENCRYPT_KEY." }, { status: 400 });
      }
    }

    // ===== Challenge verification =====
    const challenge = resolveFeishuChallenge(body);
    if (challenge) return NextResponse.json(challenge);

    // ===== Event deduplication =====
    const b = body as Record<string, unknown>;
    const header = b.header as Record<string, unknown> | undefined;
    const eventId = header?.event_id as string | undefined;
    if (eventId) {
      if (isEventAlreadyProcessed(eventId)) {
        return NextResponse.json({ ok: true, skipped: "duplicate" });
      }
      markEventProcessed(eventId);
    }

    // ===== Handle: @ mention → create task =====
    const msgEvent = normalizeMessageEvent(body);
    if (msgEvent && msgEvent.mentionedBot && msgEvent.text.length >= 2) {
      const origin = process.env.NEXT_PUBLIC_APP_BASE_URL || new URL(request.url).origin;

      const store = getKanbanStore();
      const currentBoard = await store.read();

      // Map sender open_id to team member
      const member = currentBoard.team.find((m) => m.feishuOpenId === msgEvent.senderId)
        ?? currentBoard.team[0];

      const board = await store.update((state) =>
        createTask(state, {
          title: msgEvent.text.slice(0, 80),
          type: "ops",
          priority: "normal",
          source: "feishu_message",
          outcome: "（待完善）",
          context: `来自飞书消息，发送人：${member.name}，消息ID：${msgEvent.messageId}`,
          acceptanceCriteria: []
        }, member.id)
      );

      const newTask = board.tasks[0];
      const replyCard = buildAtReplyCard(newTask.title, newTask.id, member.name, origin);

      // Reply to the chat
      if (isFeishuConfigured()) {
        await sendInteractiveCard({
          receiveIdType: msgEvent.chatType === "p2p" ? "open_id" : "chat_id",
          receiveId: msgEvent.chatType === "p2p" ? msgEvent.senderId : msgEvent.chatId,
          card: replyCard
        });
      }

      return NextResponse.json({ ok: true, taskId: newTask.id, message: "Task created from @ mention" });
    }

    return NextResponse.json({ ok: true, received: true });

    // ===== Handle: message reaction → task action =====
    // If someone reacts with ✅ (OK / THUMBSUP) to a task card, approve it
    if (header?.event_type === "im.message.reaction.created_v1") {
      const event = b.event as Record<string, unknown> | undefined;
      const messageId = event?.message_id as string | undefined;
      const reactionType = (event?.reaction_type as Record<string, unknown>)?.emoji_type as string | undefined;
      const operatorOpenId = (event?.operator_id as Record<string, unknown>)?.open_id as string | undefined;

      const APPROVE_EMOJIS = new Set(["OK", "THUMBSUP", "CHECKMARK", "YES", "DONE"]);

      if (messageId && reactionType && APPROVE_EMOJIS.has((reactionType as string).toUpperCase())) {
        const store = getKanbanStore();
        const board = await store.read();
        const task = board.tasks.find((t) => t.feishu.messageId === messageId);
        const member = board.team.find((m) => m.feishuOpenId === operatorOpenId);
        await tryApproveByReaction(store, task, member);
      }
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[feishu/events]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feishu event failed." },
      { status: 400 }
    );
  }
}

// Helper: avoid TS strict narrowing issues with find() results in callback chains
async function tryApproveByReaction(
  store: ReturnType<typeof import("@/lib/store").getKanbanStore>,
  task: import("@/domain/models").StartupTask | undefined,
  member: import("@/domain/models").TeamMember | undefined
): Promise<void> {
  if (!task || !member) return;
  if (task.status !== "review") return;
  if (task.assigneeUserId === member.id) return;
  const tid = task.id;
  const mid = member.id;
  try {
    await store.update((state) => approveDone(state, tid, mid));
  } catch { /* validation failure — ignore */ }
}
