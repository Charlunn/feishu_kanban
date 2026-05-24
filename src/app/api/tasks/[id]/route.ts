import { NextResponse } from "next/server";
import { canDeleteTask } from "@/domain/permissions";
import { getKanbanStore } from "@/lib/store";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { actorUserId } = (await request.json()) as { actorUserId?: string };
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === actorUserId);
      if (!actor || !canDeleteTask(actor, state)) throw new Error("你没有删除任务权限。");
      const task = state.tasks.find((item) => item.id === id);
      if (!task) throw new Error("任务不存在。");
      const now = new Date().toISOString();
      return {
        ...state,
        tasks: state.tasks.filter((item) => item.id !== id),
        auditLogs: [
          {
            id: `audit_delete_${id}_${Date.now()}`,
            at: now,
            actorUserId: actor.id,
            taskId: id,
            action: "drop_move",
            details: { deleted: true, title: task.title }
          },
          ...state.auditLogs
        ]
      };
    });

    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "任务删除失败。" },
      { status: 400 }
    );
  }
}

