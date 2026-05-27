import crypto from "node:crypto";
import { canCreateTask, canDeleteTask, canManageRoles, canManageTeam, hasPermission, memberPermissions } from "../../domain/permissions.ts";
import { AGENT_TASK_ACTIONS, RISK_FLAGS, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "../../domain/models.ts";
import type { AgentTokenRecord, FeishuUserSession, StartupBoardState, TeamMember } from "../../domain/models.ts";
import { getAgentTokenSummaries } from "./state.ts";
import { isFeishuConfigured } from "../feishu/client.ts";

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
  schemaEndpoint: string;
}

export interface AgentApiSchema {
  taskDraft: {
    format: "json";
    required: string[];
    optional: string[];
    enums: {
      type: readonly string[];
      priority: readonly string[];
      riskFlags: readonly string[];
      source: readonly string[];
    };
    defaults: Record<string, string>;
    aliases: Record<string, string[]>;
    example: Record<string, unknown>;
  };
  taskAction: {
    requiredOneOf: string[];
    enums: {
      action: readonly string[];
      targetStatus: readonly string[];
    };
    examples: Array<Record<string, unknown>>;
  };
  routes: Array<{ method: string; path: string; purpose: string }>;
  rules: string[];
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
    allowedTaskActions: [...AGENT_TASK_ACTIONS],
    schemaEndpoint: "/api/agent/schema"
  };
}

export function buildAgentApiSchema(): AgentApiSchema {
  return {
    taskDraft: {
      format: "json",
      required: ["title", "type", "priority", "outcome"],
      optional: ["source", "context", "acceptanceCriteria", "riskFlags", "dueAt", "linkLabel", "linkHref"],
      enums: {
        type: TASK_TYPES,
        priority: TASK_PRIORITIES,
        riskFlags: RISK_FLAGS,
        source: ["manual", "feishu_message", "feishu_card", "official_site_lead", "diagnosis_review", "quote_review", "delivery_followup"]
      },
      defaults: {
        source: "manual",
        context: "",
        acceptanceCriteria: "[]",
        riskFlags: "[]"
      },
      aliases: {
        type: ["task_type", "taskType"],
        outcome: ["goal"],
        context: ["background"],
        acceptanceCriteria: ["acceptance_criteria", "criteria"],
        riskFlags: ["risk_flags"],
        dueAt: ["due_at"],
        linkHref: ["link_url", "link"],
        linkLabel: ["link_label"]
      },
      example: {
        title: "跟进官网新增线索",
        type: "sales",
        priority: "high",
        source: "manual",
        outcome: "确认线索是否进入深度诊断，并完成首次响应",
        context: "线索来自官网表单，需要当天回访",
        acceptanceCriteria: ["完成首次联系", "记录线索结论"],
        riskFlags: [],
        dueAt: "2026-05-30T18:00:00+08:00",
        linkLabel: "线索表单",
        linkHref: "https://example.com/lead/123"
      }
    },
    taskAction: {
      requiredOneOf: ["action", "targetStatus"],
      enums: {
        action: AGENT_TASK_ACTIONS,
        targetStatus: TASK_STATUSES
      },
      examples: [
        { action: "claim_task" },
        { action: "block_task", note: "等待客户补充范围" },
        { targetStatus: "review" }
      ]
    },
    routes: [
      { method: "GET", path: "/api/agent/me", purpose: "确认当前身份与权限" },
      { method: "GET", path: "/api/agent/capabilities", purpose: "获取能力边界与 schema 入口" },
      { method: "GET", path: "/api/agent/schema", purpose: "读取任务/动作的精确契约" },
      { method: "GET", path: "/api/agent/tasks", purpose: "查询任务列表" },
      { method: "POST", path: "/api/agent/tasks", purpose: "创建任务" },
      { method: "POST", path: "/api/agent/tasks/{id}/actions", purpose: "执行任务动作或状态流转" },
      { method: "PATCH", path: "/api/agent/tasks/{id}", purpose: "更新任务字段" },
      { method: "DELETE", path: "/api/agent/tasks/{id}", purpose: "删除任务" }
    ],
    rules: [
      "所有 agent 路由都只使用 Bearer token 鉴权，不要发送 memberId 或 actorUserId。",
      "创建任务时优先使用 JSON，不要使用 YAML 直接请求接口。",
      "如果缺少必填字段，先补全草案再提交，不要猜测敏感信息。",
      "动作流转前先读取当前任务状态，避免发送不合法动作。"
    ]
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
2. Call \`GET /api/agent/schema\` before preparing any payload.
3. Call \`GET /api/agent/me\` and confirm the acting identity.
4. If the user asks to publish a requirement, first rewrite it into a task draft using the template below.
5. Only after the draft is complete, call \`POST /api/agent/tasks\`.
6. If the user asks to continue execution, read the latest task state first and then use one task action at a time.
7. Do not invent sensitive data, hidden links, deadlines, or acceptance criteria. Ask for missing details when they materially affect execution.
8. Before destructive actions like delete or broad team changes, restate the exact target and consequence.

## Capability snapshot

- canCreateTask: ${capabilities.canCreateTask}
- canDeleteTask: ${capabilities.canDeleteTask}
- canManageTeam: ${capabilities.canManageTeam}
- canManageRoles: ${capabilities.canManageRoles}
- canManageAllTasks: ${capabilities.canManageAllTasks}

## Task draft format

Send JSON, not YAML, when you call the API:

\`\`\`json
{
  "title": "跟进官网新增线索",
  "type": "sales",
  "priority": "high",
  "source": "manual",
  "outcome": "确认线索是否进入深度诊断，并完成首次响应",
  "context": "线索来自官网表单，需要当天回访",
  "acceptanceCriteria": ["完成首次联系", "记录线索结论"],
  "riskFlags": [],
  "dueAt": "2026-05-30T18:00:00+08:00",
  "linkLabel": "线索表单",
  "linkHref": "https://example.com/lead/123"
}
\`\`\`

## API usage

- Always send header: \`Authorization: Bearer ${token}\`
- \`GET /api/agent/schema\`: read the exact field contract before create/update/action requests
- \`GET /api/agent/board\`: fetch the latest board
- \`GET /api/agent/tasks\`: list tasks
- \`POST /api/agent/tasks\`: create a task from a complete draft
- \`POST /api/agent/tasks/{id}/actions\`: claim, start, block, request review, approve done, release, reopen
- \`PATCH /api/agent/tasks/{id}\`: update task fields
- \`DELETE /api/agent/tasks/{id}\`: delete a task if allowed
- \`PATCH /api/agent/team/{id}\`: update team member settings if allowed

## Important rules

- Do not send \`memberId\` or \`actorUserId\` to any \`/api/agent/*\` route.
- If the user writes fields in snake_case such as \`task_type\` or \`due_at\`, normalize them to the contract from \`GET /api/agent/schema\` before requesting.
- For actions, send either \`{"action":"claim_task"}\` or \`{"targetStatus":"review"}\`.
- Before any action request, fetch the task again or otherwise confirm the latest status from the API.
- If a request fails, read the error, re-read \`GET /api/agent/schema\` or the current task, and retry only after correcting the payload or state mismatch.

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
  if (!isFeishuConfigured()) {
    return member;
  }
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
