import { NextResponse } from "next/server";
import { z } from "zod";
import { ALL_PERMISSIONS, boardRoles, canManageRoles } from "@/domain/permissions";
import { getKanbanStore } from "@/lib/store";

const createRoleSchema = z.object({
  actorUserId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40),
  permissions: z.array(z.enum(["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"])).default([])
});

export async function POST(request: Request) {
  try {
    const payload = createRoleSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => {
      const actor = state.team.find((member) => member.id === payload.actorUserId);
      if (!actor || !canManageRoles(actor, state)) throw new Error("你没有管理角色权限。");

      const role = {
        id: `role_${Date.now().toString(36)}`,
        name: payload.name,
        permissions: payload.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
      };

      return {
        ...state,
        roles: [...boardRoles(state), role]
      };
    });

    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "角色创建失败。" },
      { status: 400 }
    );
  }
}

