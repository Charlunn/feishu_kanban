import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createTask, getBoardSummary } from "@/domain/operations";
import { buildTaskCard } from "@/lib/feishu/cards";
import { getKanbanStore } from "@/lib/store";
import { createTaskSchema } from "@/lib/validation";
import { sendInteractiveCard, isFeishuConfigured, getFeishuConfig, pinMessage } from "@/lib/feishu/client";
import { upsertBitableRecord, isBitableConfigured } from "@/lib/feishu/bitable";
import { createFeishuTask } from "@/lib/feishu/tasks";

const WEBAPPURL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3015";

export async function GET() {
  const board = await getKanbanStore().read();
  return NextResponse.json({ board, summary: getBoardSummary(board) });
}

export async function POST(request: Request) {
  try {
    const payload = createTaskSchema.parse(await request.json());
    const store = getKanbanStore();

    let board = await store.update((state) =>
      createTask(state, {
        title: payload.title,
        type: payload.type,
        priority: payload.priority,
        source: payload.source,
        outcome: payload.outcome,
        context: payload.context,
        acceptanceCriteria: payload.acceptanceCriteria,
        riskFlags: payload.riskFlags,
        dueAt: payload.dueAt,
        linkHref: payload.linkHref,
        linkLabel: payload.linkLabel
      }, payload.actorUserId)
    );

    const task = board.tasks[0];
    const card = buildTaskCard(task, WEBAPPURL);

    // Send card to default chat if bot is configured (high-risk tasks get immediate visibility)
    const config = getFeishuConfig();
    const defaultChatId = config.defaultChatId || board.feishu.defaultChatId || "";
    let messageId: string | undefined;

    if (isFeishuConfigured(config) && defaultChatId && task.riskFlags.length > 0) {
      try {
        const result = await sendInteractiveCard({
          receiveIdType: "chat_id",
          receiveId: defaultChatId,
          card
        }, config);
        messageId = result.messageId;
      } catch (e) {
        console.warn("[tasks/create] card send failed:", e);
      }
    }

    // Store messageId on the task's feishu binding so we can patch it later
    if (messageId) {
      board = await store.update((state) => ({
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, feishu: { ...t.feishu, messageId } } : t
        )
      }));

      // Pin urgent tasks to keep them visible in the chat
      if (task.priority === "urgent" || task.riskFlags.length > 0) {
        pinMessage(messageId, config).catch((e) => console.warn("[tasks/create] pin failed:", e));
      }
    }

    // Create a Feishu native task so it appears in the assignee's task list
    const assignee = task.assigneeUserId ? board.team.find((m) => m.id === task.assigneeUserId) : undefined;
    if (isFeishuConfigured(config)) {
      createFeishuTask(task, assignee, config).then((ref) => {
        if (ref?.taskGuid) {
          store.update((state) => ({
            ...state,
            tasks: state.tasks.map((t) =>
              t.id === task.id ? { ...t, feishu: { ...t.feishu, feishuTaskGuid: ref.taskGuid } } : t
            )
          })).catch(() => undefined);
        }
      }).catch((e) => console.warn("[tasks/create] feishu task failed:", e));
    }

    // Sync to Bitable mirror if configured
    if (isBitableConfigured()) {
      upsertBitableRecord(task)
        .catch((e) => console.warn("[tasks/create] bitable sync failed:", e));
    }

    return NextResponse.json(
      { board, task, feishuCardPreview: card, messageId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "任务信息不完整。" }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败。" }, { status: 400 });
  }
}
