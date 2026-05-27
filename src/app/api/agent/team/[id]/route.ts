import { NextResponse } from "next/server";
import { z } from "zod";
import { TASK_TYPES } from "@/domain/models";
import { ALL_PERMISSIONS, boardRoles, canManageTeam, roleForMember } from "@/domain/permissions";
import { withAgentSession } from "@/lib/agent/request";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { getKanbanStore } from "@/lib/store";

const teamUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  roleId: z.string().trim().min(1).optional(),
  permissions: z.array(z.enum(["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"])).optional(),
  mode: z.enum(["available", "focused", "reviewing", "away"]).optional(),
  maxActiveTasks: z.number().int().nonnegative().optional(),
  skills: z.array(z.enum(TASK_TYPES)).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { member } = await withAgentSession(request);
    const { id } = await context.params;
    const payload = teamUpdateSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((item) => item.id === member.id);
      if (!actor || !canManageTeam(actor, state)) {
        throw new Error("当前用户没有成员管理权限。");
      }
      const target = state.team.find((item) => item.id === id);
      if (!target) throw new Error("成员不存在。");
      if (payload.roleId && !boardRoles(state).some((role) => role.id === payload.roleId)) {
        throw new Error("角色不存在。");
      }
      return {
        ...state,
        team: state.team.map((item) => {
          if (item.id !== id) return item;
          const roleId = payload.roleId || item.roleId;
          const role = roleId
            ? boardRoles(state).find((entry) => entry.id === roleId)
            : roleForMember(state, item);
          return {
            ...item,
            name: payload.name || item.name,
            roleId,
            roleLabel: role?.name || item.roleLabel,
            permissions: payload.permissions
              ? payload.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
              : item.permissions,
            mode: payload.mode || item.mode,
            maxActiveTasks: payload.maxActiveTasks ?? item.maxActiveTasks,
            skills: payload.skills || item.skills
          };
        })
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
      { success: false, error: error instanceof Error ? error.message : "成员更新失败。" },
      { status: 400 }
    );
  }
}
