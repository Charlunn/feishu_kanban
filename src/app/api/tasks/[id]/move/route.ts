import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { moveTaskByAction, moveTaskByDrop } from "@/domain/operations";
import { getKanbanStore } from "@/lib/store";
import { moveTaskSchema } from "@/lib/validation";
import { patchInteractiveCard, isFeishuConfigured, addMessageReaction } from "@/lib/feishu/client";
import { buildTaskCard } from "@/lib/feishu/cards";
import { upsertBitableRecord, isBitableConfigured } from "@/lib/feishu/bitable";
import { updateFeishuTask } from "@/lib/feishu/tasks";

const WEBAPPURL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3015";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = moveTaskSchema.parse(await request.json());

    const board = await getKanbanStore().update((state) =>
      payload.targetStatus
        ? moveTaskByDrop(state, id, payload.memberId, payload.targetStatus, payload.note)
        : moveTaskByAction(state, id, payload.memberId, payload.action!, payload.note)
    );

    // Side effects (non-blocking)
    const updatedTask = board.tasks.find((t) => t.id === id);
    if (updatedTask) {
      const configured = isFeishuConfigured();

      // 1. Patch Feishu card in-place
      if (configured && updatedTask.feishu.messageId) {
        patchInteractiveCard(updatedTask.feishu.messageId, buildTaskCard(updatedTask, WEBAPPURL))
          .catch((e) => console.warn("[move] card patch failed:", e));
      }

      // 2. Add ✅ reaction when task is completed
      if (configured && updatedTask.status === "done" && updatedTask.feishu.messageId) {
        addMessageReaction(updatedTask.feishu.messageId, "OK")
          .catch(() => undefined);
      }

      // 3. Sync to Feishu native task list
      if (configured && updatedTask.feishu.feishuTaskGuid) {
        updateFeishuTask(updatedTask.feishu.feishuTaskGuid, updatedTask)
          .catch((e) => console.warn("[move] feishu task update failed:", e));
      }

      // 4. Sync to Bitable mirror
      if (isBitableConfigured()) {
        upsertBitableRecord(updatedTask)
          .catch((e) => console.warn("[move] bitable sync failed:", e));
      }
    }

    return NextResponse.json({ board });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "推进参数不完整。" }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "推进失败。" }, { status: 400 });
  }
}
