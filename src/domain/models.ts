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

export type TaskStatus = "pool" | "ready" | "claimed" | "doing" | "review" | "done" | "blocked";

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export type TaskType = "sales" | "diagnosis" | "delivery" | "ops" | "product" | "feishu";

export type TaskSource =
  | "manual"
  | "feishu_message"
  | "feishu_card"
  | "official_site_lead"
  | "diagnosis_review"
  | "quote_review"
  | "delivery_followup";

export type RiskFlag = "customer_facing" | "sensitive_data" | "quote_scope" | "ai_output" | "ops_only";

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

export interface TeamMember {
  id: string;
  name: string;
  roleLabel: string;
  feishuOpenId: string;
  roleId?: string;
  permissions?: TeamPermission[];
  mode: MemberMode;
  maxActiveTasks: number;
  skills: TaskType[];
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
  action: BoardAction | "feishu_event_received" | "feishu_card_sent" | "permission_denied" | "feishu_login" | "reminder_sent";
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
