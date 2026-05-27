import type { AgentTokenRecord, StartupBoardState, StartupTask, TeamMember } from "../../domain/models.ts";

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
    team: state.team.map(stripMemberSecrets),
    tasks: state.tasks.map(enrichTaskForAgent)
  } as StartupBoardState;
}

export function getAgentTokenSummaries(member: TeamMember): AgentTokenSummary[] {
  return (member.agentAccess?.tokens ?? []).map(({ tokenHash: _tokenHash, ...token }) => token);
}

export function enrichTaskForAgent(task: StartupTask): StartupTask & {
  linkHref?: string;
  linkLabel?: string;
} {
  return {
    ...task,
    linkHref: task.links[0]?.href,
    linkLabel: task.links[0]?.label
  };
}
