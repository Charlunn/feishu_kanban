import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createTask, getBoardSummary } from "@/domain/operations";
import { canCreateTask } from "@/domain/permissions";
import { withAgentSession } from "@/lib/agent/request";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { agentTaskDraftSchema } from "@/lib/validation";
import { getKanbanStore } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { board } = await withAgentSession(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const assigneeUserId = url.searchParams.get("assigneeUserId");
    const tasks = board.tasks.filter((task) => {
      if (status && task.status !== status) return false;
      if (assigneeUserId && task.assigneeUserId !== assigneeUserId) return false;
      return true;
    });
    return NextResponse.json({
      success: true,
      data: {
        tasks,
        total: tasks.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent auth failed." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { member } = await withAgentSession(request);
    const payload = agentTaskDraftSchema.parse(await request.json());
    const store = getKanbanStore();
    const board = await store.update((state) => {
      const actor = state.team.find((item) => item.id === member.id);
      if (!actor || !canCreateTask(actor, state)) {
        throw new Error("当前用户没有创建任务权限。");
      }
      return createTask(state, payload, actor.id);
    });
    const task = board.tasks[0];
    return NextResponse.json({
      success: true,
      data: {
        task,
        board: sanitizeBoardForClient(board),
        summary: getBoardSummary(board)
      },
      nextSuggestedActions: task.status === "ready" || task.status === "pool"
        ? ["claim_task", "start_task"]
        : []
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "Task draft is invalid."
      : error instanceof Error ? error.message : "Task creation failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
