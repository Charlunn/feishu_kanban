import { NextResponse } from "next/server";
import { moveTaskByAction } from "@/domain/operations";
import { buildCardActionToast, normalizeFeishuCardAction } from "@/lib/feishu/events";
import { ensureEmployeeFromFeishu } from "@/lib/feishu/identity";
import { getKanbanStore } from "@/lib/store";
import { patchInteractiveCard } from "@/lib/feishu/client";
import { buildTaskCard } from "@/lib/feishu/cards";

const WEBAPPURL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3015";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalized = normalizeFeishuCardAction(body);

    // If block reason came from Card 2.0 inline form, use it as the note
    const note = normalized.blockReason || normalized.note;

    const store = getKanbanStore();
    const board = await store.update((state) => {
      if (normalized.memberId) {
        const member = state.team.find((m) => m.id === normalized.memberId);
        if (member) return moveTaskByAction(state, normalized.taskId, member.id, normalized.action, note);
      }
      const ensured = ensureEmployeeFromFeishu(state, normalized.openId);
      return moveTaskByAction(ensured.state, normalized.taskId, ensured.member.id, normalized.action, note);
    });

    // Patch the card in-place so it reflects the new status
    const updatedTask = board.tasks.find((t) => t.id === normalized.taskId);
    if (updatedTask?.feishu.messageId) {
      try {
        const updatedCard = buildTaskCard(updatedTask, WEBAPPURL);
        await patchInteractiveCard(updatedTask.feishu.messageId, updatedCard);
      } catch {
        // Card patch failure is non-critical — don't reject the action
      }
    }

    const statusMsg = normalized.action === "block_task"
      ? "已标记阻塞"
      : normalized.action === "approve_done"
        ? "✅ 复核通过，任务已完成"
        : normalized.action === "claim_task"
          ? "已认领任务"
          : "任务状态已更新";

    return NextResponse.json(buildCardActionToast(statusMsg));
  } catch (error) {
    return NextResponse.json(
      buildCardActionToast(
        error instanceof Error ? error.message : "任务操作失败",
        "error"
      ),
      { status: 400 }
    );
  }
}
