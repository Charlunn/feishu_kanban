import type { StartupBoardState, TeamMember } from "../../domain/models.ts";
import { getKanbanStore } from "../store.ts";
import { authenticateAgentToken, touchAgentTokenUsage } from "./auth.ts";

export async function withAgentSession(
  request: Request
): Promise<{ board: StartupBoardState; member: TeamMember }> {
  const store = getKanbanStore();
  let resolvedMember: TeamMember | null = null;

  const board = await store.update(async (state) => {
    const { member, token } = await authenticateAgentToken(state, request);
    resolvedMember = member;
    return touchAgentTokenUsage(state, member.id, token.id, new URL(request.url).pathname);
  });

  if (!resolvedMember) {
    throw new Error("Agent session could not be resolved.");
  }

  return { board, member: resolvedMember };
}
