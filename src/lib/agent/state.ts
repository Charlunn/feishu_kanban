import type { AgentTokenRecord, StartupBoardState, TeamMember } from "../../domain/models.ts";

export type AgentTokenSummary = Omit<AgentTokenRecord, "tokenHash">;

function stripMemberSecrets(member: TeamMember): TeamMember {
  const { agentAccess, ...rest } = member;
  if (!agentAccess) return rest;
  return {
    ...rest,
    agentAccess: {
      tokens: agentAccess.tokens.map(({ tokenHash: _tokenHash, ...token }) => token)
    }
  } as TeamMember;
}

export function sanitizeBoardForClient(state: StartupBoardState): StartupBoardState {
  return {
    ...state,
    team: state.team.map(stripMemberSecrets)
  } as StartupBoardState;
}

export function getAgentTokenSummaries(member: TeamMember): AgentTokenSummary[] {
  return (member.agentAccess?.tokens ?? []).map(({ tokenHash: _tokenHash, ...token }) => token);
}
