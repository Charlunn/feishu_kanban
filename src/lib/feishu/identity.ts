import type { StartupBoardState, TeamMember } from "../../domain/models.ts";

export function memberFromFeishuOpenId(state: StartupBoardState, openId?: string): TeamMember | null {
  if (!openId) return null;
  return state.team.find((member) => member.feishuOpenId === openId) || null;
}

export function memberOrFallbackFromFeishu(state: StartupBoardState, openId?: string, fallbackMemberId = "member_founder"): TeamMember {
  return memberFromFeishuOpenId(state, openId) || state.team.find((member) => member.id === fallbackMemberId) || state.team[0];
}
