import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTeam } from "@/domain/permissions";
import { getKanbanStore } from "@/lib/store";

const updateMemberSchema = z.object({
  actorUserId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40).optional(),
  canCreateTasks: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateMemberSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === payload.actorUserId);
      if (!actor || !canManageTeam(actor)) {
        throw new Error("你没有管理团队权限。");
      }

      const target = state.team.find((member) => member.id === id);
      if (!target) throw new Error("成员不存在。");

      return {
        ...state,
        team: state.team.map((member) => {
          if (member.id !== id) return member;
          const permissions = new Set(member.permissions || []);
          if (payload.canCreateTasks === true) permissions.add("create_task");
          if (payload.canCreateTasks === false && !permissions.has("manage_team")) permissions.delete("create_task");
          return {
            ...member,
            name: payload.name || member.name,
            roleLabel: permissions.has("manage_team") ? "创始人" : permissions.has("create_task") ? "可派活成员" : "普通员工",
            permissions: Array.from(permissions)
          };
        })
      };
    });

    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "成员更新失败。" },
      { status: 400 }
    );
  }
}

