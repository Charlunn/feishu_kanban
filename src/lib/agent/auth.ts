import crypto from "node:crypto";
import { canCreateTask, canDeleteTask, canManageRoles, canManageTeam, hasPermission, memberPermissions } from "../../domain/permissions.ts";
import type { AgentTokenRecord, FeishuUserSession, StartupBoardState, TeamMember } from "../../domain/models.ts";
import { getAgentTokenSummaries } from "./state.ts";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

export interface AgentIdentity {
  memberId: string;
  name: string;
  roleLabel: string;
  permissions: ReturnType<typeof memberPermissions>;
}

export interface AgentCapabilities {
  canCreateTask: boolean;
  canDeleteTask: boolean;
  canManageTeam: boolean;
  canManageRoles: boolean;
  canManageAllTasks: boolean;
  allowedTaskActions: string[];
}

export interface AgentSkillBundle {
  fileName: string;
  content: string;
  cliDownloadPath: string;
  cliCommand: string;
}

export interface SessionProofInput {
  memberId: string;
  accessToken: string;
}

export function buildAgentIdentity(member: TeamMember, state: StartupBoardState): AgentIdentity {
  return {
    memberId: member.id,
    name: member.name,
    roleLabel: member.roleLabel,
    permissions: memberPermissions(member, state)
  };
}

export function buildAgentCapabilities(member: TeamMember, state: StartupBoardState): AgentCapabilities {
  return {
    canCreateTask: canCreateTask(member, state),
    canDeleteTask: canDeleteTask(member, state),
    canManageTeam: canManageTeam(member, state),
    canManageRoles: canManageRoles(member, state),
    canManageAllTasks: hasPermission(member, "manage_all_tasks", state),
    allowedTaskActions: ["claim_task", "start_task", "request_review", "approve_done", "block_task", "release_task", "reopen_task"]
  };
}

export function getAgentBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "http://localhost:3015";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createStableId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function buildTokenPreview(token: string): string {
  return `${token.slice(0, 10)}...${token.slice(-4)}`;
}

export function generateAgentTokenValue(): string {
  return `dstk_${crypto.randomBytes(24).toString("base64url")}`;
}

export function createAgentTokenRecord(name: string, token: string, now = new Date().toISOString()): AgentTokenRecord {
  return {
    id: createStableId("agtok"),
    name: name.trim() || "默认 AI Token",
    tokenHash: hashToken(token),
    tokenPreview: buildTokenPreview(token),
    createdAt: now
  };
}

export function createAgentTokenForMember(
  state: StartupBoardState,
  memberId: string,
  name: string,
  now = new Date().toISOString()
): { board: StartupBoardState; token: string; record: AgentTokenRecord } {
  const token = generateAgentTokenValue();
  const record = createAgentTokenRecord(name, token, now);
  const board: StartupBoardState = {
    ...state,
    team: state.team.map((member) =>
      member.id === memberId
        ? {
            ...member,
            agentAccess: {
              tokens: [...(member.agentAccess?.tokens ?? []), record]
            }
          }
        : member
    ),
    auditLogs: [
      {
        id: createStableId("audit"),
        at: now,
        actorUserId: memberId,
        action: "agent_token_created",
        details: {
          tokenId: record.id,
          tokenName: record.name
        }
      },
      ...state.auditLogs
    ]
  };
  return { board, token, record };
}

export function revokeAgentTokenForMember(
  state: StartupBoardState,
  memberId: string,
  tokenId: string,
  now = new Date().toISOString()
): StartupBoardState {
  return {
    ...state,
    team: state.team.map((member) =>
      member.id === memberId
        ? {
            ...member,
            agentAccess: {
              tokens: (member.agentAccess?.tokens ?? []).map((token) =>
                token.id === tokenId ? { ...token, revokedAt: now } : token
              )
            }
          }
        : member
    ),
    auditLogs: [
      {
        id: createStableId("audit"),
        at: now,
        actorUserId: memberId,
        action: "agent_token_revoked",
        details: {
          tokenId
        }
      },
      ...state.auditLogs
    ]
  };
}

export function buildAgentSkillBundle(
  member: TeamMember,
  state: StartupBoardState,
  token: string
): AgentSkillBundle {
  const baseUrl = getAgentBaseUrl();
  const cliDownloadPath = `${baseUrl}/agent/kanban-agent.mjs`;
  const cliCommand = `curl -fsSL ${cliDownloadPath} -o kanban-agent.mjs && node kanban-agent.mjs whoami --base-url ${baseUrl} --token ${token}`;
  const capabilities = buildAgentCapabilities(member, state);
  const content = `---
name: dotstack-kanban-agent
description: Use this skill when you need to turn requirements into structured tasks and execute allowed actions in the DOTSTACK Kanban web app via its external agent API.
---

# DOTSTACK Kanban Agent

## Connection

- API base URL: \`${baseUrl}\`
- User member ID: \`${member.id}\`
- User display name: \`${member.name}\`
- Bearer token: \`${token}\`
- CLI download: \`${cliDownloadPath}\`

## Required workflow

1. Call \`GET /api/agent/capabilities\` first.
2. Call \`GET /api/agent/me\` and confirm the acting identity.
3. If the user asks to publish a requirement, first rewrite it into a task draft using the template below.
4. Only after the draft is complete, call \`POST /api/agent/tasks\`.
5. If the user asks to continue execution, use task actions one step at a time and report what changed.
6. Do not invent sensitive data, hidden links, deadlines, or acceptance criteria. Ask for missing details when they materially affect execution.
7. Before destructive actions like delete or broad team changes, restate the exact target and consequence.

## Capability snapshot

- canCreateTask: ${capabilities.canCreateTask}
- canDeleteTask: ${capabilities.canDeleteTask}
- canManageTeam: ${capabilities.canManageTeam}
- canManageRoles: ${capabilities.canManageRoles}
- canManageAllTasks: ${capabilities.canManageAllTasks}

## Task draft format

\`\`\`yaml
title:
type: sales | diagnosis | delivery | quote | ops | product | feishu
priority: urgent | high | normal | low
source: manual
outcome:
context:
acceptanceCriteria:
  - 
riskFlags:
  - 
dueAt:
linkLabel:
linkHref:
\`\`\`

## API usage

- Always send header: \`Authorization: Bearer ${token}\`
- \`GET /api/agent/board\`: fetch the latest board
- \`GET /api/agent/tasks\`: list tasks
- \`POST /api/agent/tasks\`: create a task from a complete draft
- \`POST /api/agent/tasks/{id}/actions\`: claim, start, block, request review, approve done, release, reopen
- \`PATCH /api/agent/tasks/{id}\`: update task fields
- \`DELETE /api/agent/tasks/{id}\`: delete a task if allowed
- \`PATCH /api/agent/team/{id}\`: update team member settings if allowed

## CLI

\`\`\`bash
${cliCommand}
\`\`\`
`;

  return {
    fileName: `dotstack-kanban-agent-${member.id}.md`,
    content,
    cliDownloadPath,
    cliCommand
  };
}

export function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization")?.trim() || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer token.");
  }
  return header.slice(7).trim();
}

export async function verifyFeishuSessionProof(
  state: StartupBoardState,
  proof: SessionProofInput
): Promise<TeamMember> {
  const member = state.team.find((item) => item.id === proof.memberId);
  if (!member) throw new Error("成员不存在。");
  if (!member.feishuOpenId) throw new Error("当前成员未绑定飞书账号。");

  const response = await fetch(`${FEISHU_BASE_URL}/authen/v1/user_info`, {
    headers: {
      authorization: `Bearer ${proof.accessToken}`
    }
  });
  const json = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: {
      open_id?: string;
      union_id?: string;
    };
  };
  if (!response.ok || json.code !== 0 || !json.data) {
    throw new Error(`飞书登录校验失败: ${json.msg || response.statusText}`);
  }
  if (json.data.open_id !== member.feishuOpenId && (!member.feishuUnionId || json.data.union_id !== member.feishuUnionId)) {
    throw new Error("登录身份与当前成员不匹配。");
  }
  return member;
}

export async function authenticateAgentToken(
  state: StartupBoardState,
  request: Request
): Promise<{ member: TeamMember; token: AgentTokenRecord }> {
  const tokenValue = readBearerToken(request);
  const tokenHash = hashToken(tokenValue);

  for (const member of state.team) {
    for (const token of member.agentAccess?.tokens ?? []) {
      if (token.tokenHash === tokenHash && !token.revokedAt) {
        return { member, token };
      }
    }
  }

  throw new Error("Invalid or revoked agent token.");
}

export function touchAgentTokenUsage(
  state: StartupBoardState,
  memberId: string,
  tokenId: string,
  path: string,
  now = new Date().toISOString()
): StartupBoardState {
  return {
    ...state,
    team: state.team.map((member) =>
      member.id === memberId
        ? {
            ...member,
            agentAccess: {
              tokens: (member.agentAccess?.tokens ?? []).map((token) =>
                token.id === tokenId ? { ...token, lastUsedAt: now } : token
              )
            }
          }
        : member
    ),
    auditLogs: [
      {
        id: createStableId("audit"),
        at: now,
        actorUserId: memberId,
        action: "agent_api_call",
        details: {
          tokenId,
          path
        }
      },
      ...state.auditLogs
    ]
  };
}

export function buildFeishuSessionPayload(session: FeishuUserSession): SessionProofInput {
  return {
    memberId: session.memberId,
    accessToken: session.accessToken
  };
}

export function getTokenSummariesForMember(member: TeamMember) {
  return getAgentTokenSummaries(member);
}
