export type MemberMode = "available" | "focused" | "reviewing" | "away";
export type TeamPermission =
  | "create_task"
  | "manage_team"
  | "manage_roles"
  | "delete_task"
  | "manage_all_tasks";

export interface TeamRole {
  id: string;
  name: string;
  permissions: TeamPermission[];
  system?: boolean;
}

export interface AgentTokenRecord {
  id: string;
  name: string;
  tokenHash: string;
  tokenPreview: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export type TaskStatus = "pool" | "ready" | "claimed" | "doing" | "review" | "done" | "blocked";
export const TASK_STATUSES = ["pool", "ready", "claimed", "doing", "review", "done", "blocked"] as const;

export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const TASK_TYPES = ["sales", "diagnosis", "delivery", "quote", "ops", "product", "feishu"] as const;
export type TaskType = typeof TASK_TYPES[number];

export const TASK_SOURCES = [
  "manual",
  "feishu_message",
  "feishu_card",
  "official_site_lead",
  "diagnosis_review",
  "quote_review",
  "delivery_followup"
] as const;
export type TaskSource = typeof TASK_SOURCES[number];

export const RISK_FLAGS = ["customer_facing", "sensitive_data", "quote_scope", "ai_output", "ops_only"] as const;
export type RiskFlag = typeof RISK_FLAGS[number];

export type BoardAction =
  | "create_task"
  | "claim_task"
  | "start_task"
  | "request_review"
  | "approve_done"
  | "block_task"
  | "release_task"
  | "reopen_task"
  | "drop_move";

export const AGENT_TASK_ACTIONS = [
  "claim_task",
  "start_task",
  "request_review",
  "approve_done",
  "block_task",
  "release_task",
  "reopen_task"
] as const;

export interface TeamMember {
  id: string;
  name: string;
  roleLabel: string;
  feishuOpenId: string;
  feishuUnionId?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  roleId?: string;
  permissions?: TeamPermission[];
  mode: MemberMode;
  maxActiveTasks: number;
  skills: TaskType[];
  agentAccess?: {
    tokens: AgentTokenRecord[];
  };
}

export interface WorkLink {
  label: string;
  href: string;
  surface: "feishu_doc" | "feishu_bitable" | "official_site" | "internal" | "external";
}

export interface FeishuBinding {
  chatId?: string;
  messageId?: string;
  cardId?: string;
  bitableRecordId?: string;
  /** Feishu native task guid (task v2 API) */
  feishuTaskGuid?: string;
  deepLink?: string;
  lastPushedAt?: string;
}

export interface WorkLogEntry {
  id: string;
  at: string;
  actorUserId: string;
  action: BoardAction;
  note: string;
}

export interface StartupTask {
  id: string;
  title: string;
  source: TaskSource;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  createdByUserId: string;
  assigneeUserId?: string;
  reviewerUserId?: string;
  outcome: string;
  context: string;
  acceptanceCriteria: string[];
  riskFlags: RiskFlag[];
  links: WorkLink[];
  feishu: FeishuBinding;
  blockedReason?: string;
  dueAt?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  startedAt?: string;
  reviewRequestedAt?: string;
  completedAt?: string;
  workLog: WorkLogEntry[];
}

export interface BoardAuditLog {
  id: string;
  at: string;
  actorUserId: string;
  taskId?: string;
  action:
    | BoardAction
    | "feishu_event_received"
    | "feishu_card_sent"
    | "permission_denied"
    | "feishu_login"
    | "reminder_sent"
    | "agent_token_created"
    | "agent_token_revoked"
    | "agent_api_call";
  details: Record<string, unknown>;
}

export interface FeishuUserSession {
  openId: string;
  unionId?: string;
  name: string;
  avatarUrl?: string;
  memberId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

export interface StartupBoardState {
  roles?: TeamRole[];
  team: TeamMember[];
  tasks: StartupTask[];
  auditLogs: BoardAuditLog[];
  feishu: {
    appName: string;
    defaultChatId?: string;
    webAppUrl: string;
    bitableMirrorEnabled: boolean;
    botEnabled: boolean;
  };
}

export interface BoardSummary {
  total: number;
  open: number;
  inProgress: number;
  waitingReview: number;
  done: number;
  blocked: number;
  availableMembers: number;
}
