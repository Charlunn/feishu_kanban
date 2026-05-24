import type { StartupBoardState, TeamMember, TeamPermission, TeamRole } from "./models.ts";

const FOUNDER_ID = "member_founder";

export const ALL_PERMISSIONS: TeamPermission[] = [
  "create_task",
  "manage_team",
  "manage_roles",
  "delete_task",
  "manage_all_tasks"
];

export const PERMISSION_LABELS: Record<TeamPermission, string> = {
  create_task: "创建任务",
  manage_team: "管理成员",
  manage_roles: "管理角色",
  delete_task: "删除任务",
  manage_all_tasks: "管理全部任务"
};

export const DEFAULT_ROLES: TeamRole[] = [
  { id: "role_founder", name: "创始人", permissions: ALL_PERMISSIONS, system: true },
  { id: "role_admin", name: "管理员", permissions: ["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"] },
  { id: "role_dispatcher", name: "派活成员", permissions: ["create_task"] },
  { id: "role_employee", name: "普通员工", permissions: [], system: true }
];

export function boardRoles(state: StartupBoardState): TeamRole[] {
  const roles = state.roles?.length ? state.roles : DEFAULT_ROLES;
  const byId = new Map(DEFAULT_ROLES.map((role) => [role.id, role]));
  for (const role of roles) byId.set(role.id, { ...byId.get(role.id), ...role });
  return Array.from(byId.values());
}

export function roleForMember(state: StartupBoardState, member: TeamMember): TeamRole {
  const roles = boardRoles(state);
  if (member.roleId) {
    const role = roles.find((item) => item.id === member.roleId);
    if (role) return role;
  }
  return member.id === FOUNDER_ID
    ? roles.find((item) => item.id === "role_founder") || DEFAULT_ROLES[0]
    : roles.find((item) => item.id === "role_employee") || DEFAULT_ROLES[3];
}

export function memberPermissions(member: TeamMember, state?: StartupBoardState): TeamPermission[] {
  const permissions = new Set<TeamPermission>();
  if (state) {
    for (const permission of roleForMember(state, member).permissions) permissions.add(permission);
  } else if (member.id === FOUNDER_ID) {
    for (const permission of ALL_PERMISSIONS) permissions.add(permission);
  }
  for (const permission of member.permissions || []) permissions.add(permission);
  return Array.from(permissions);
}

export function hasPermission(member: TeamMember, permission: TeamPermission, state?: StartupBoardState): boolean {
  return memberPermissions(member, state).includes(permission);
}

export function canCreateTask(member: TeamMember, state?: StartupBoardState): boolean {
  return hasPermission(member, "create_task", state);
}

export function canManageTeam(member: TeamMember, state?: StartupBoardState): boolean {
  return hasPermission(member, "manage_team", state);
}

export function canManageRoles(member: TeamMember, state?: StartupBoardState): boolean {
  return hasPermission(member, "manage_roles", state);
}

export function canDeleteTask(member: TeamMember, state?: StartupBoardState): boolean {
  return hasPermission(member, "delete_task", state);
}

export function findFounder(state: StartupBoardState): TeamMember | undefined {
  return state.team.find((member) => canManageTeam(member, state));
}
