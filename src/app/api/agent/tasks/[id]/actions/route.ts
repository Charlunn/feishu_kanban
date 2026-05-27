import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { moveTaskByAction, moveTaskByDrop } from "@/domain/operations";
import { withAgentSession } from "@/lib/agent/request";
import { enrichTaskForAgent, sanitizeBoardForClient } from "@/lib/agent/state";
import { agentTaskActionSchema } from "@/lib/validation";
import { getKanbanStore } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { member } = await withAgentSession(request);
    const { id } = await context.params;
    const payload = agentTaskActionSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) =>
      payload.targetStatus
        ? moveTaskByDrop(state, id, member.id, payload.targetStatus, payload.note)
        : moveTaskByAction(state, id, member.id, payload.action!, payload.note)
    );
    const task = board.tasks.find((item) => item.id === id);
    return NextResponse.json({
      success: true,
      data: {
        task: task ? enrichTaskForAgent(task) : task,
        board: sanitizeBoardForClient(board)
      },
      nextSuggestedActions: task?.status === "review" ? ["approve_done", "reopen_task"] : []
    });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "动作参数不合法。"
      : error instanceof Error ? error.message : "任务动作失败。";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
