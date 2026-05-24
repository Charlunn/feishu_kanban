import type {
  BoardAction,
  BoardAuditLog,
  BoardSummary,
  RiskFlag,
  StartupBoardState,
  StartupTask,
  TaskPriority,
  TaskStatus,
  TaskType,
  TeamMember,
  WorkLogEntry
} from "./models.ts";

export const TASK_COLUMNS: Array<{ status: TaskStatus; label: string; intent: string }> = [
  { status: "pool", label: "任务池", intent: "刚被提出，还需要一句话确认范围" },
  { status: "ready", label: "可领取", intent: "任何空闲成员都可以拿走" },
  { status: "claimed", label: "已认领", intent: "已有人负责，准备开工" },
  { status: "doing", label: "进行中", intent: "正在推进，卡住要及时标记" },
  { status: "blocked", label: "阻塞", intent: "缺资料、缺判断或依赖外部输入" },
  { status: "review", label: "待复核", intent: "交付前需要另一个人看一遍" },
  { status: "done", label: "已完成", intent: "达到验收条件并留痕" }
];

const ACTIVE_STATUSES: TaskStatus[] = ["claimed", "doing", "review"];
const CLAIMABLE_STATUSES: TaskStatus[] = ["pool", "ready", "blocked"];
const PRIORITY_SCORE: Record<TaskPriority, number> = {
  urgent: 400,
  high: 300,
  normal: 200,
  low: 100
};

export interface CreateTaskInput {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  source?: StartupTask["source"];
  outcome: string;
  context?: string;
  acceptanceCriteria: string[];
  riskFlags?: RiskFlag[];
  dueAt?: string;
  linkHref?: string;
  linkLabel?: string;
}

export function createTask(state: StartupBoardState, input: CreateTaskInput, actorUserId: string, now = new Date().toISOString()): StartupBoardState {
  assertMember(state, actorUserId);
  const task: StartupTask = {
    id: stableId("task", input.title, now),
    title: input.title.trim(),
    source: input.source || "manual",
    type: input.type,
    priority: input.priority,
    status: input.acceptanceCriteria.length > 0 ? "ready" : "pool",
    createdByUserId: actorUserId,
    outcome: input.outcome.trim(),
    context: input.context?.trim() || "由飞书任务看板提出，等待负责人补充上下文。",
    acceptanceCriteria: input.acceptanceCriteria.map((item) => item.trim()).filter(Boolean),
    riskFlags: input.riskFlags || [],
    dueAt: input.dueAt || undefined,
    links: input.linkHref
      ? [
          {
            label: input.linkLabel || "相关材料",
            href: input.linkHref,
            surface: input.linkHref.includes("feishu") || input.linkHref.includes("larksuite") ? "feishu_doc" : "external"
          }
        ]
      : [],
    feishu: {
      deepLink: `${state.feishu.webAppUrl}?task=${encodeURIComponent(input.title)}`
    },
    createdAt: now,
    updatedAt: now,
    workLog: [workLog(now, actorUserId, "create_task", "提出任务并进入看板。")]
  };
  return appendAudit({ ...state, tasks: [task, ...state.tasks] }, now, actorUserId, task.id, "create_task", {
    title: task.title,
    priority: task.priority,
    status: task.status
  });
}

export function claimTask(state: StartupBoardState, taskId: string, memberId: string, now = new Date().toISOString()): StartupBoardState {
  const member = assertMember(state, memberId);
  const task = assertTask(state, taskId);
  if (!CLAIMABLE_STATUSES.includes(task.status)) {
    throw new Error(`Task cannot be claimed from status: ${task.status}`);
  }
  const activeCount = activeTasksFor(state, memberId).length;
  if (member.mode === "away") {
    throw new Error(`${member.name} is away and cannot claim tasks.`);
  }
  if (activeCount >= member.maxActiveTasks) {
    throw new Error(`${member.name} has reached WIP limit ${member.maxActiveTasks}.`);
  }
  return updateTask(state, taskId, now, memberId, "claim_task", "认领任务。", {
    status: "claimed",
    assigneeUserId: memberId,
    blockedReason: undefined,
    claimedAt: now
  });
}

export function startTask(state: StartupBoardState, taskId: string, memberId: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.assigneeUserId !== memberId) {
    throw new Error("Only the assignee can start this task.");
  }
  if (task.status !== "claimed") {
    throw new Error(`Task cannot start from status: ${task.status}`);
  }
  return updateTask(state, taskId, now, memberId, "start_task", "开始推进。", {
    status: "doing",
    startedAt: now
  });
}

export function requestReview(state: StartupBoardState, taskId: string, memberId: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.assigneeUserId !== memberId) {
    throw new Error("Only the assignee can request review.");
  }
  if (task.status !== "doing") {
    throw new Error(`Review can only be requested from doing, got: ${task.status}`);
  }
  const reviewer = selectReviewer(state, task);
  return updateTask(state, taskId, now, memberId, "request_review", `提交复核，建议复核人：${reviewer.name}。`, {
    status: "review",
    reviewerUserId: reviewer.id,
    reviewRequestedAt: now
  });
}

export function approveDone(state: StartupBoardState, taskId: string, reviewerId: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  assertMember(state, reviewerId);
  if (task.status !== "review") {
    throw new Error(`Only review tasks can be completed, got: ${task.status}`);
  }
  if (requiresIndependentReview(task) && task.assigneeUserId === reviewerId) {
    throw new Error("External-facing or risky tasks require review by another member.");
  }
  if (task.acceptanceCriteria.length === 0) {
    throw new Error("Task cannot be completed without acceptance criteria.");
  }
  return updateTask(state, taskId, now, reviewerId, "approve_done", "复核通过并完成。", {
    status: "done",
    reviewerUserId: reviewerId,
    completedAt: now
  });
}

export function blockTask(state: StartupBoardState, taskId: string, memberId: string, reason: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.assigneeUserId && task.assigneeUserId !== memberId) {
    throw new Error("Only the assignee can block this task.");
  }
  if (!reason.trim()) {
    throw new Error("Blocked reason is required.");
  }
  return updateTask(state, taskId, now, memberId, "block_task", `标记阻塞：${reason.trim()}`, {
    status: "blocked",
    blockedReason: reason.trim()
  });
}

export function releaseTask(state: StartupBoardState, taskId: string, memberId: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.createdByUserId !== memberId && task.assigneeUserId !== memberId) {
    throw new Error("Only creator or assignee can release a task.");
  }
  return updateTask(state, taskId, now, memberId, "release_task", "释放任务回到可领取状态。", {
    status: "ready",
    assigneeUserId: undefined,
    reviewerUserId: undefined,
    blockedReason: undefined,
    claimedAt: undefined,
    startedAt: undefined,
    reviewRequestedAt: undefined
  });
}

export function reopenTask(state: StartupBoardState, taskId: string, memberId: string, note: string, now = new Date().toISOString()): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.status !== "review" && task.status !== "done") {
    throw new Error(`Only review or done tasks can be reopened, got: ${task.status}`);
  }
  return updateTask(state, taskId, now, memberId, "reopen_task", note.trim() || "复核未通过，退回继续处理。", {
    status: "doing",
    reviewerUserId: undefined
  });
}

export function moveTaskByAction(
  state: StartupBoardState,
  taskId: string,
  actorUserId: string,
  action: Exclude<BoardAction, "create_task">,
  note = "",
  now = new Date().toISOString()
): StartupBoardState {
  switch (action) {
    case "claim_task":
      return claimTask(state, taskId, actorUserId, now);
    case "start_task":
      return startTask(state, taskId, actorUserId, now);
    case "request_review":
      return requestReview(state, taskId, actorUserId, now);
    case "approve_done":
      return approveDone(state, taskId, actorUserId, now);
    case "block_task":
      return blockTask(state, taskId, actorUserId, note, now);
    case "release_task":
      return releaseTask(state, taskId, actorUserId, now);
    case "reopen_task":
      return reopenTask(state, taskId, actorUserId, note, now);
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

export function moveTaskByDrop(
  state: StartupBoardState,
  taskId: string,
  actorUserId: string,
  targetStatus: TaskStatus,
  note = "",
  now = new Date().toISOString()
): StartupBoardState {
  const task = assertTask(state, taskId);
  if (task.status === targetStatus) return state;

  if (targetStatus === "pool") {
    if (task.status === "done") throw new Error("Done tasks cannot be dragged back to pool.");
    return updateTask(state, taskId, now, actorUserId, "drop_move", note || "拖回任务池，等待重新确认范围。", {
      status: "pool",
      assigneeUserId: undefined,
      reviewerUserId: undefined,
      blockedReason: undefined
    });
  }

  if (targetStatus === "ready") {
    if (task.status === "done") throw new Error("Done tasks cannot be released without reopening.");
    return updateTask(state, taskId, now, actorUserId, "drop_move", note || "拖回可领取，释放给团队。", {
      status: "ready",
      assigneeUserId: undefined,
      reviewerUserId: undefined,
      blockedReason: undefined,
      claimedAt: undefined,
      startedAt: undefined,
      reviewRequestedAt: undefined
    });
  }

  if (targetStatus === "claimed") {
    if (CLAIMABLE_STATUSES.includes(task.status)) return claimTask(state, taskId, actorUserId, now);
    if (task.assigneeUserId !== actorUserId) throw new Error("Only the assignee can move this task back to claimed.");
    return updateTask(state, taskId, now, actorUserId, "drop_move", note || "拖回已认领，暂缓推进。", {
      status: "claimed",
      reviewerUserId: undefined
    });
  }

  if (targetStatus === "doing") {
    if (CLAIMABLE_STATUSES.includes(task.status)) {
      return startTask(claimTask(state, taskId, actorUserId, now), taskId, actorUserId, now);
    }
    if (task.status === "claimed") return startTask(state, taskId, actorUserId, now);
    if (task.status === "review") return reopenTask(state, taskId, actorUserId, note || "拖回复工，继续修改。", now);
    throw new Error(`Task cannot be dragged to doing from status: ${task.status}`);
  }

  if (targetStatus === "blocked") {
    return blockTask(state, taskId, actorUserId, note || "拖入阻塞列，等待补充说明。", now);
  }

  if (targetStatus === "review") {
    let working = state;
    if (CLAIMABLE_STATUSES.includes(task.status)) {
      working = startTask(claimTask(working, taskId, actorUserId, now), taskId, actorUserId, now);
    } else if (task.status === "claimed") {
      working = startTask(working, taskId, actorUserId, now);
    }
    return requestReview(working, taskId, actorUserId, now);
  }

  if (targetStatus === "done") {
    return approveDone(state, taskId, actorUserId, now);
  }

  throw new Error(`Unsupported drop target: ${targetStatus}`);
}

export function getBoardSummary(state: StartupBoardState): BoardSummary {
  return {
    total: state.tasks.length,
    open: state.tasks.filter((task) => ["pool", "ready", "claimed", "doing", "review"].includes(task.status)).length,
    inProgress: state.tasks.filter((task) => task.status === "claimed" || task.status === "doing").length,
    waitingReview: state.tasks.filter((task) => task.status === "review").length,
    done: state.tasks.filter((task) => task.status === "done").length,
    blocked: state.tasks.filter((task) => task.status === "blocked").length,
    availableMembers: state.team.filter((member) => member.mode === "available" && activeTasksFor(state, member.id).length < member.maxActiveTasks).length
  };
}

export function getTasksByColumn(state: StartupBoardState): Record<TaskStatus, StartupTask[]> {
  return {
    pool: sortTasks(state.tasks.filter((task) => task.status === "pool")),
    ready: sortTasks(state.tasks.filter((task) => task.status === "ready")),
    claimed: sortTasks(state.tasks.filter((task) => task.status === "claimed")),
    doing: sortTasks(state.tasks.filter((task) => task.status === "doing")),
    review: sortTasks(state.tasks.filter((task) => task.status === "review")),
    done: sortTasks(state.tasks.filter((task) => task.status === "done")),
    blocked: sortTasks(state.tasks.filter((task) => task.status === "blocked"))
  };
}

export function suggestNextTaskForMember(state: StartupBoardState, memberId: string): StartupTask | null {
  const member = assertMember(state, memberId);
  if (member.mode === "away" || activeTasksFor(state, memberId).length >= member.maxActiveTasks) {
    return null;
  }
  return sortTasks(
    state.tasks.filter((task) => (task.status === "ready" || task.status === "pool") && (member.skills.includes(task.type) || task.priority === "urgent"))
  )[0] || null;
}

export function activeTasksFor(state: StartupBoardState, memberId: string): StartupTask[] {
  return state.tasks.filter((task) => task.assigneeUserId === memberId && ACTIVE_STATUSES.includes(task.status));
}

export function requiresIndependentReview(task: StartupTask): boolean {
  return task.riskFlags.some((flag) => flag === "customer_facing" || flag === "sensitive_data" || flag === "quote_scope" || flag === "ai_output");
}

function sortTasks(tasks: StartupTask[]): StartupTask[] {
  return [...tasks].sort((a, b) => {
    const priority = PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority];
    if (priority !== 0) return priority;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function updateTask(
  state: StartupBoardState,
  taskId: string,
  now: string,
  actorUserId: string,
  action: Exclude<BoardAction, "create_task">,
  note: string,
  patch: Partial<StartupTask>
): StartupBoardState {
  assertMember(state, actorUserId);
  const task = assertTask(state, taskId);
  const nextTask: StartupTask = {
    ...task,
    ...patch,
    updatedAt: now,
    workLog: [...task.workLog, workLog(now, actorUserId, action, note)]
  };
  const nextState = {
    ...state,
    tasks: state.tasks.map((item) => (item.id === taskId ? nextTask : item))
  };
  return appendAudit(nextState, now, actorUserId, taskId, action, {
    from: task.status,
    to: nextTask.status,
    assigneeUserId: nextTask.assigneeUserId,
    reviewerUserId: nextTask.reviewerUserId
  });
}

function selectReviewer(state: StartupBoardState, task: StartupTask): TeamMember {
  const activeByMember = new Map(state.team.map((member) => [member.id, activeTasksFor(state, member.id).length]));
  const candidates = state.team
    .filter((member) => member.id !== task.assigneeUserId && member.mode !== "away")
    .sort((a, b) => (activeByMember.get(a.id) || 0) - (activeByMember.get(b.id) || 0));
  const reviewer = candidates[0] || state.team.find((member) => member.id !== task.assigneeUserId) || state.team[0];
  if (!reviewer) throw new Error("No team member is available to review this task.");
  return reviewer;
}

function appendAudit(
  state: StartupBoardState,
  now: string,
  actorUserId: string,
  taskId: string | undefined,
  action: BoardAuditLog["action"],
  details: Record<string, unknown>
): StartupBoardState {
  return {
    ...state,
    auditLogs: [
      {
        id: stableId("audit", `${actorUserId}-${action}-${taskId || "board"}`, now),
        at: now,
        actorUserId,
        taskId,
        action,
        details
      },
      ...state.auditLogs
    ]
  };
}

function workLog(at: string, actorUserId: string, action: BoardAction, note: string): WorkLogEntry {
  return {
    id: stableId("log", `${actorUserId}-${action}`, at),
    at,
    actorUserId,
    action,
    note
  };
}

function assertMember(state: StartupBoardState, memberId: string): TeamMember {
  const member = state.team.find((item) => item.id === memberId);
  if (!member) {
    throw new Error(`Member not found: ${memberId}`);
  }
  return member;
}

function assertTask(state: StartupBoardState, taskId: string): StartupTask {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return task;
}

function stableId(prefix: string, value: string, now: string): string {
  const base = `${value}-${now}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 44);
  return `${prefix}_${base || Math.random().toString(36).slice(2, 10)}`;
}
