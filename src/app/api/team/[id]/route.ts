import { NextResponse } from "next/server";
import { z } from "zod";
import { ALL_PERMISSIONS, boardRoles, canManageTeam, memberPermissions, roleForMember } from "@/domain/permissions";
import { getKanbanStore } from "@/lib/store";

const updateMemberSchema = z.object({
  actorUserId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40).optional(),
  roleId: z.string().trim().min(1).optional(),
  permissions: z.array(z.enum(["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"])).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateMemberSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === payload.actorUserId);
      if (!actor || !canManageTeam(actor, state)) {
        throw new Error("你没有管理团队权限。");
      }

      const target = state.team.find((member) => member.id === id);
      if (!target) throw new Error("成员不存在。");
      if (payload.roleId && !boardRoles(state).some((role) => role.id === payload.roleId)) {
        throw new Error("角色不存在。");
      }

      return {
        ...state,
        team: state.team.map((member) => {
          if (member.id !== id) return member;
          const roleId = payload.roleId || member.roleId;
          const role = roleId
            ? boardRoles(state).find((item) => item.id === roleId)
            : roleForMember(state, member);
          const nextPermissions = payload.permissions
            ? payload.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
            : member.permissions || [];
          return {
            ...member,
            name: payload.name || member.name,
            roleId,
            roleLabel: role?.name || member.roleLabel,
            permissions: nextPermissions
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
