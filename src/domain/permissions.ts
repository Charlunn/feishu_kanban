import type { StartupBoardState, TeamMember, TeamPermission } from "./models.ts";

const FOUNDER_ID = "member_founder";

export function memberPermissions(member: TeamMember): TeamPermission[] {
  if (member.permissions?.length) return member.permissions;
  return member.id === FOUNDER_ID ? ["create_task", "manage_team"] : [];
}

export function canCreateTask(member: TeamMember): boolean {
  return memberPermissions(member).includes("create_task");
}

export function canManageTeam(member: TeamMember): boolean {
  return memberPermissions(member).includes("manage_team");
}

export function findFounder(state: StartupBoardState): TeamMember | undefined {
  return state.team.find((member) => canManageTeam(member));
}

