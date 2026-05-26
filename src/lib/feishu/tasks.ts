/**
 * 飞书任务 API 集成 (task v2)
 *
 * 把看板任务同步到飞书原生任务列表，成员可以在飞书"任务"App 里看到，
 * 支持提醒、截止日期、负责人。
 *
 * API: POST /open-apis/task/v2/tasks
 * 文档: https://open.feishu.cn/document/server-docs/task-v2/task/create
 *
 * 所需权限: task:task (Write)
 */

import { getTenantAccessToken, isFeishuConfigured, getFeishuConfig } from "./client";
import type { StartupTask, TeamMember } from "../../domain/models";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

export interface FeishuTaskRef {
  taskGuid: string;
}

/**
 * Create a Feishu native task from a kanban task.
 * Assigns to the specified member and sets the due date.
 * Returns the feishu task_guid for future updates.
 */
export async function createFeishuTask(
  task: StartupTask,
  assignee: TeamMember | undefined,
  config = getFeishuConfig()
): Promise<FeishuTaskRef | null> {
  if (!isFeishuConfigured(config)) return null;

  const token = await getTenantAccessToken(config);
  const now = Math.floor(Date.now() / 1000);

  const body: Record<string, unknown> = {
    summary: task.title,
    description: [
      `目标：${task.outcome}`,
      task.acceptanceCriteria.length
        ? `验收条件：\n${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        : "",
      task.riskFlags.length ? `边界标记：${task.riskFlags.join("、")}` : "",
      `\n来源：点栈 KANBAN`
    ].filter(Boolean).join("\n"),
    created_at: String(now * 1000),
      // Origin identifies the task as coming from our app
    origin: {
      platform_i18n_name: {
        zh_cn: "点栈 KANBAN",
        en_us: "DOTSTACK KANBAN"
      }
    }
  };

  if (task.dueAt) {
    body.due = {
      timestamp: String(Math.floor(new Date(task.dueAt).getTime() / 1000) * 1000),
      is_all_day: false
    };
  }

  if (assignee?.feishuOpenId) {
    body.members = [
      {
        id: assignee.feishuOpenId,
        type: "user",
        role: "assignee"
      }
    ];
  }

  const res = await fetch(`${FEISHU_BASE_URL}/task/v2/tasks?user_id_type=open_id`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ task: body })
  });

  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { task?: { guid?: string } };
  };

  if (!res.ok || json.code !== 0) {
    console.warn("[feishu/tasks] createFeishuTask failed:", json.msg);
    return null;
  }

  return { taskGuid: json.data?.task?.guid ?? "" };
}

/**
 * Update a Feishu native task's status and due date when the kanban task moves.
 * Marks as completed when status = "done".
 */
export async function updateFeishuTask(
  taskGuid: string,
  task: StartupTask,
  config = getFeishuConfig()
): Promise<void> {
  if (!isFeishuConfigured(config) || !taskGuid) return;

  const token = await getTenantAccessToken(config);

  if (task.status === "done" && task.completedAt) {
    // Complete the task
    await fetch(`${FEISHU_BASE_URL}/task/v2/tasks/${taskGuid}/complete`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    return;
  }

  // Update due date if it changed
  const patch: Record<string, unknown> = {};
  if (task.dueAt) {
    patch.due = {
      timestamp: String(Math.floor(new Date(task.dueAt).getTime() / 1000) * 1000),
      is_all_day: false
    };
  }
  if (task.status !== "done") {
    patch.is_completed = false;
  }

  if (Object.keys(patch).length === 0) return;

  await fetch(`${FEISHU_BASE_URL}/task/v2/tasks/${taskGuid}?user_id_type=open_id`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ task: patch, update_fields: Object.keys(patch) })
  });
}
