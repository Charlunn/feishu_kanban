import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { ALL_PERMISSIONS, boardRoles, canManageRoles } from "@/domain/permissions";
import { getKanbanStore } from "@/lib/store";

const updateRoleSchema = z.object({
  actorUserId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40).optional(),
  permissions: z.array(z.enum(["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"])).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateRoleSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === payload.actorUserId);
      if (!actor || !canManageRoles(actor, state)) throw new Error("你没有管理角色权限。");

      const roles = boardRoles(state);
      const role = roles.find((item) => item.id === id);
      if (!role) throw new Error("角色不存在。");
      if (role.id === "role_founder") throw new Error("创始人角色不可修改。");

      return {
        ...state,
        roles: roles.map((item) =>
          item.id === id
            ? {
                ...item,
                name: payload.name || item.name,
                permissions: payload.permissions
                  ? payload.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
                  : item.permissions
              }
            : item
        )
      };
    });

    return NextResponse.json({ board: sanitizeBoardForClient(board) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "角色更新失败。" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { actorUserId } = (await request.json()) as { actorUserId?: string };
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === actorUserId);
      if (!actor || !canManageRoles(actor, state)) throw new Error("你没有管理角色权限。");

      const roles = boardRoles(state);
      const role = roles.find((item) => item.id === id);
      if (!role) throw new Error("角色不存在。");
      if (role.system) throw new Error("系统角色不可删除。");

      return {
        ...state,
        roles: roles.filter((item) => item.id !== id),
        team: state.team.map((member) => member.roleId === id ? { ...member, roleId: "role_employee", roleLabel: "普通员工" } : member)
      };
    });

    return NextResponse.json({ board: sanitizeBoardForClient(board) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "角色删除失败。" },
      { status: 400 }
    );
  }
}
