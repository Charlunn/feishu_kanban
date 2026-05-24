/**
 * 飞书消息卡片构建
 * 使用卡片 2.0 (Card Kit) 格式，支持 form / input / column_set 等组件。
 * 参考: https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-components/overview
 */
import { getBoardSummary, requiresIndependentReview } from "../../domain/operations.ts";
import type { StartupBoardState, StartupTask, TaskPriority, TaskStatus } from "../../domain/models.ts";

// ===== Card type =====
export interface FeishuCard {
  schema?: "2.0";
  config?: {
    wide_screen_mode?: boolean;
    enable_forward?: boolean;
    update_multi?: boolean;
  };
  // Card 1.0 header (used in legacy & 2.0 compat)
  header?: {
    title: { tag: "plain_text"; content: string };
    template?: string;
  };
  elements: Array<Record<string, unknown>>;
}

// ===== Labels =====
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "今天必须处理",
  high: "高优先级",
  normal: "正常",
  low: "可排队"
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pool: "任务池",
  ready: "可领取",
  claimed: "已认领",
  doing: "进行中",
  review: "待复核",
  done: "已完成",
  blocked: "阻塞"
};

const TYPE_LABEL: Record<string, string> = {
  sales: "线索跟进",
  diagnosis: "诊断复核",
  delivery: "交付验收",
  ops: "内部运营",
  product: "产品搭建",
  feishu: "飞书集成"
};

// ===== Task card (2.0) =====
// Shows full task details with contextual action buttons.
// After status change, patch the card so buttons reflect new state.
export function buildTaskCard(task: StartupTask, webAppUrl: string): FeishuCard {
  const template =
    task.status === "blocked" ? "red"
    : task.priority === "urgent" ? "orange"
    : task.status === "done" ? "green"
    : task.status === "review" ? "yellow"
    : "blue";

  const statusText = STATUS_LABEL[task.status];
  const baseUrl = webAppUrl.endsWith("/") ? webAppUrl : `${webAppUrl}/`;

  const actionElements: Record<string, unknown>[] = [];

  // Contextual buttons based on status
  if (task.status === "pool" || task.status === "ready") {
    actionElements.push(button("🙋 我来负责", "primary", { taskId: task.id, action: "claim_task" }));
  }
  if (task.status === "claimed") {
    actionElements.push(button("▶ 开始推进", "primary", { taskId: task.id, action: "start_task" }));
  }
  if (task.status === "doing") {
    actionElements.push(button("📋 提交复核", "primary", { taskId: task.id, action: "request_review" }));
    // Card 2.0 form: inline block reason input
    actionElements.push(blockReasonForm(task.id));
  }
  if (task.status === "blocked") {
    actionElements.push(button("▶ 解除阻塞", "primary", { taskId: task.id, action: "start_task" }));
    actionElements.push(button("↩ 释放任务", "default", { taskId: task.id, action: "release_task" }));
  }
  if (task.status === "review") {
    actionElements.push(button("✓ 复核通过", "primary", { taskId: task.id, action: "approve_done" }));
    actionElements.push(button("↩ 退回修改", "danger", { taskId: task.id, action: "reopen_task" }));
  }
  if (task.status === "done") {
    actionElements.push(button("↩ 重新打开", "default", { taskId: task.id, action: "reopen_task" }));
  }
  actionElements.push(linkButton("🔗 打开看板", `${baseUrl}?focus=${encodeURIComponent(task.id)}`));

  const bodyLines = [
    `**状态**：${statusText}　**优先级**：${PRIORITY_LABEL[task.priority]}`,
    `**类型**：${TYPE_LABEL[task.type] ?? task.type}`,
    `**目标**：${task.outcome}`,
  ];
  if (task.dueAt) {
    const d = new Date(task.dueAt);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const dueTxt = diff < 0 ? `⚠ 已超期` : diff < 4 * 3600_000 ? `⏰ ${Math.round(diff / 3600_000)}小时后` : d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    bodyLines.push(`**截止**：${dueTxt}`);
  }
  if (task.riskFlags.length > 0) {
    const needsReview = requiresIndependentReview(task);
    bodyLines.push(`**边界**：${task.riskFlags.join(" / ")}${needsReview ? " · 需独立复核" : ""}`);
  }
  if (task.blockedReason) {
    bodyLines.push(`**阻塞原因**：${task.blockedReason}`);
  }

  const criteriaText = task.acceptanceCriteria.length
    ? task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : "（未设置）";

  return {
    schema: "2.0",
    config: { wide_screen_mode: true, enable_forward: false, update_multi: true },
    header: { title: { tag: "plain_text", content: `任务：${task.title}` }, template },
    elements: [
      divider(),
      markdown(bodyLines.join("\n")),
      markdown(`**验收条件**\n${criteriaText}`),
      divider(),
      ...actionElements
    ]
  };
}

// ===== Board digest card =====
export function buildBoardDigestCard(state: StartupBoardState): FeishuCard {
  const summary = getBoardSummary(state);
  const ready = state.tasks.filter((t) => t.status === "ready" || t.status === "pool").slice(0, 5);
  const review = state.tasks.filter((t) => t.status === "review").slice(0, 5);
  const blocked = state.tasks.filter((t) => t.status === "blocked").slice(0, 3);
  const webAppUrl = state.feishu.webAppUrl;

  return {
    schema: "2.0",
    config: { wide_screen_mode: true, enable_forward: true, update_multi: false },
    header: {
      title: { tag: "plain_text", content: `${state.feishu.appName}｜今日任务摘要` },
      template: summary.blocked > 0 ? "orange" : "blue"
    },
    elements: [
      divider(),
      columnSet([
        metricColumn("可领取", String(summary.open - summary.inProgress - summary.waitingReview)),
        metricColumn("进行中", String(summary.inProgress)),
        metricColumn("待复核", String(summary.waitingReview)),
        metricColumn("阻塞", String(summary.blocked))
      ]),
      divider(),
      markdown(`**📥 可拿的活**\n${ready.length ? ready.map((t) => `- [${PRIORITY_LABEL[t.priority]}] ${t.title}`).join("\n") : "- 暂无等待认领的任务"}`),
      ...(review.length ? [markdown(`**📋 等人复核**\n${review.map((t) => `- ${t.title}　复核人：${t.reviewerUserId ?? "待分配"}`).join("\n")}`)] : []),
      ...(blocked.length ? [markdown(`**⚠ 阻塞中**\n${blocked.map((t) => `- ${t.title}　原因：${t.blockedReason ?? "未说明"}`).join("\n")}`)] : []),
      divider(),
      actions([linkButton("🔗 打开飞书内嵌工作台", webAppUrl)])
    ]
  };
}

// ===== Reminder card =====
export function buildReminderCard(
  task: StartupTask,
  recipientName: string,
  isOverdue: boolean,
  webAppUrl: string
): FeishuCard {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const dueStr = dueDate
    ? `${dueDate.getMonth() + 1}月${dueDate.getDate()}日 ${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`
    : "未设置";
  const title = isOverdue ? `⚠️ 任务已超期：${task.title}` : `⏰ 任务即将到期：${task.title}`;
  const baseUrl = webAppUrl.endsWith("/") ? webAppUrl : `${webAppUrl}/`;

  return {
    schema: "2.0",
    config: { wide_screen_mode: true, enable_forward: false, update_multi: false },
    header: { title: { tag: "plain_text", content: title }, template: isOverdue ? "red" : "orange" },
    elements: [
      divider(),
      markdown(`**${recipientName}**，你有一个任务${isOverdue ? "**已经超期**" : "**即将到期**"}，请尽快处理。`),
      markdown(
        `**任务**：${task.title}\n` +
        `**类型**：${TYPE_LABEL[task.type] ?? task.type}\n` +
        `**状态**：${STATUS_LABEL[task.status]}\n` +
        `**截止时间**：${dueStr}\n` +
        `**目标**：${task.outcome}`
      ),
      ...(task.riskFlags.length ? [markdown(`**边界**：${task.riskFlags.join(" / ")}`)] : []),
      divider(),
      actions([
        button(isOverdue ? "⚡ 立即处理" : "👀 查看任务", "primary", { taskId: task.id, action: "start_task" }),
        linkButton("🔗 打开看板", `${baseUrl}?focus=${encodeURIComponent(task.id)}`)
      ])
    ]
  };
}

// ===== @ Reply card =====
// Used when the bot is @ mentioned in a chat to create a task
export function buildAtReplyCard(
  taskTitle: string,
  taskId: string,
  senderName: string,
  webAppUrl: string
): FeishuCard {
  const baseUrl = webAppUrl.endsWith("/") ? webAppUrl : `${webAppUrl}/`;
  return {
    schema: "2.0",
    config: { wide_screen_mode: false, enable_forward: false, update_multi: false },
    header: { title: { tag: "plain_text", content: "任务已创建" }, template: "green" },
    elements: [
      markdown(`收到 **${senderName}** 的消息，已创建任务：\n**${taskTitle}**\n\n任务已进入任务池，需要补充验收条件后方可领取。`),
      actions([linkButton("🔗 查看并完善任务", `${baseUrl}?focus=${encodeURIComponent(taskId)}`)])
    ]
  };
}

// ===== Card 2.0 inline block reason form =====
// Rendered when task is in "doing" state — user fills reason then clicks "标记阻塞"
function blockReasonForm(taskId: string): Record<string, unknown> {
  return {
    tag: "form",
    elements: [
      {
        tag: "input",
        name: "block_reason",
        required: true,
        max_length: 200,
        label: { tag: "plain_text", content: "阻塞原因" },
        placeholder: { tag: "plain_text", content: "缺什么资料 / 等谁的决定 / 依赖外部输入…" },
        fallback: "🔒 此组件在旧版飞书中不可用，请在看板网页中操作"
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "⚠ 标记阻塞" },
        type: "danger",
        behaviors: [
          {
            type: "callback",
            callback_value: {
              taskId,
              action: "block_task",
              source: "card_form"
            }
          }
        ]
      }
    ]
  };
}

// ===== Helpers =====
function divider(): Record<string, unknown> {
  return { tag: "hr" };
}

function markdown(content: string): Record<string, unknown> {
  return { tag: "markdown", content };
}

function actions(actionsValue: Array<Record<string, unknown>>): Record<string, unknown> {
  return { tag: "action", actions: actionsValue };
}

function button(
  text: string,
  type: "primary" | "default" | "danger",
  value: Record<string, string>,
  disabled = false
): Record<string, unknown> {
  return {
    tag: "button",
    text: { tag: "plain_text", content: text },
    type,
    value,
    disabled
  };
}

function linkButton(text: string, url: string): Record<string, unknown> {
  return { tag: "button", text: { tag: "plain_text", content: text }, type: "default", url };
}

function columnSet(columns: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    tag: "column_set",
    flex_mode: "stretch",
    background_style: "default",
    columns
  };
}

function metricColumn(label: string, value: string): Record<string, unknown> {
  return {
    tag: "column",
    elements: [
      markdown(`**${value}**\n${label}`)
    ]
  };
}
