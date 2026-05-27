import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { canDeleteTask, hasPermission } from "@/domain/permissions";
import type { StartupTask } from "@/domain/models";
import { withAgentSession } from "@/lib/agent/request";
import { enrichTaskForAgent, sanitizeBoardForClient } from "@/lib/agent/state";
import { agentTaskUpdateSchema } from "@/lib/validation";
import { getKanbanStore } from "@/lib/store";

function canEditTask(task: StartupTask, memberId: string, state: { team: unknown[] }): boolean {
  void state;
  return task.createdByUserId === memberId || task.assigneeUserId === memberId;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { board } = await withAgentSession(request);
    const { id } = await context.params;
    const task = board.tasks.find((item) => item.id === id);
    if (!task) {
      return NextResponse.json({ success: false, error: "任务不存在。" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { task: enrichTaskForAgent(task) } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent auth failed." },
      { status: 401 }
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { member } = await withAgentSession(request);
    const { id } = await context.params;
    const payload = agentTaskUpdateSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((item) => item.id === member.id);
      const task = state.tasks.find((item) => item.id === id);
      if (!actor || !task) throw new Error("任务不存在。");
      if (!canEditTask(task, actor.id, state) && !hasPermission(actor, "manage_all_tasks", state)) {
        throw new Error("当前用户没有编辑这个任务的权限。");
      }
      const links = payload.linkHref
        ? [{
            label: payload.linkLabel || task.links[0]?.label || "相关材料",
            href: payload.linkHref,
            surface: payload.linkHref.includes("feishu") || payload.linkHref.includes("larksuite") ? "feishu_doc" as const : "external" as const
          }]
        : payload.linkHref === ""
          ? []
          : task.links;
      const nextTask: StartupTask = {
        ...task,
        ...payload,
        links,
        updatedAt: new Date().toISOString(),
        workLog: [
          ...task.workLog,
          {
            id: `log_agent_patch_${Date.now()}`,
            at: new Date().toISOString(),
            actorUserId: actor.id,
            action: "drop_move",
            note: "通过外部 AI 代理更新任务字段。"
          }
        ]
      };
      return {
        ...state,
        tasks: state.tasks.map((item) => item.id === id ? nextTask : item)
      };
    });
    return NextResponse.json({
      success: true,
      data: {
        task: enrichTaskForAgent(board.tasks.find((item) => item.id === id)!),
        board: sanitizeBoardForClient(board)
      }
    });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "更新参数不合法。"
      : error instanceof Error ? error.message : "任务更新失败。";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { member } = await withAgentSession(request);
    const { id } = await context.params;
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((item) => item.id === member.id);
      const task = state.tasks.find((item) => item.id === id);
      if (!actor || !canDeleteTask(actor, state)) {
        throw new Error("当前用户没有删除任务权限。");
      }
      if (!task) throw new Error("任务不存在。");
      return {
        ...state,
        tasks: state.tasks.filter((item) => item.id !== id),
        auditLogs: [
          {
            id: `audit_delete_${id}_${Date.now()}`,
            at: new Date().toISOString(),
            actorUserId: actor.id,
            taskId: id,
            action: "drop_move",
            details: { deleted: true, title: task.title, via: "agent_api" }
          },
          ...state.auditLogs
        ]
      };
    });
    return NextResponse.json({
      success: true,
      data: {
        board: sanitizeBoardForClient(board)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "任务删除失败。" },
      { status: 400 }
    );
  }
}
