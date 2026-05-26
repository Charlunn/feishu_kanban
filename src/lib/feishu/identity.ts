import type { StartupBoardState, TeamMember } from "../../domain/models.ts";

export function systemFallbackMember(): TeamMember {
  return {
    id: "system",
    name: "系统",
    roleLabel: "系统",
    feishuOpenId: "",
    roleId: "role_employee",
    permissions: [],
    mode: "available",
    maxActiveTasks: 0,
    skills: []
  };
}

export function memberFromFeishuOpenId(state: StartupBoardState, openId?: string): TeamMember | null {
  if (!openId) return null;
  return state.team.find((member) => member.feishuOpenId === openId) || null;
}

export function memberOrFallbackFromFeishu(state: StartupBoardState, openId?: string, fallbackMemberId = "member_founder"): TeamMember {
  return memberFromFeishuOpenId(state, openId) || state.team.find((member) => member.id === fallbackMemberId) || state.team[0] || systemFallbackMember();
}

export function ensureEmployeeFromFeishu(
  state: StartupBoardState,
  openId?: string,
  name = "飞书成员"
): { state: StartupBoardState; member: TeamMember } {
  const existing = memberFromFeishuOpenId(state, openId);
  if (existing) return { state, member: existing };

  if (!openId) return { state, member: state.team[0] || systemFallbackMember() };

  const member: TeamMember = {
    id: `member_${openId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 36)}`,
    name,
    roleLabel: "普通员工",
    feishuOpenId: openId,
    roleId: "role_employee",
    permissions: [],
    mode: "available",
    maxActiveTasks: 2,
    skills: ["sales", "diagnosis", "delivery", "quote", "ops", "product", "feishu"]
  };

  return {
    state: { ...state, team: [...state.team, member] },
    member
  };
}
