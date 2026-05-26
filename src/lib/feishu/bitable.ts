/**
 * 飞书多维表格 (Bitable) 镜像
 *
 * 任务的数据源始终是我们自己的状态机，Bitable 只是只读镜像，
 * 方便团队在飞书里用表格视图、看板视图、甘特图查看任务进度。
 *
 * API 文档: https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview
 *
 * 使用方式:
 * 1. 在飞书多维表格新建一个应用
 * 2. 复制 app_token（URL 中 /base/ 后面的部分）
 * 3. 在应用中新建一个数据表，复制 table_id
 * 4. 设置以下环境变量:
 *    FEISHU_BITABLE_APP_TOKEN=xxx
 *    FEISHU_BITABLE_TABLE_ID=xxx
 */

import { getTenantAccessToken, isFeishuConfigured, getFeishuConfig } from "./client";
import type { StartupTask, TaskStatus, TaskPriority } from "../../domain/models";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

const APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || "";
const TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || "";

export function isBitableConfigured(): boolean {
  return Boolean(APP_TOKEN && TABLE_ID && isFeishuConfigured());
}

/** Field mapping: our model → Bitable column names */
const FIELD_MAP = {
  id: "任务ID",
  title: "任务标题",
  status: "状态",
  priority: "优先级",
  type: "业务类型",
  assignee: "负责人",
  reviewer: "复核人",
  outcome: "完成标准",
  riskFlags: "边界标记",
  dueAt: "截止时间",
  blockedReason: "阻塞原因",
  createdAt: "创建时间",
  updatedAt: "更新时间"
} as const;

const STATUS_ZH: Record<TaskStatus, string> = {
  pool: "任务池", ready: "可领取", claimed: "已认领",
  doing: "进行中", blocked: "阻塞", review: "待复核", done: "已完成"
};
const PRIORITY_ZH: Record<TaskPriority, string> = {
  urgent: "紧急", high: "高", normal: "中", low: "低"
};
const TYPE_ZH: Record<string, string> = {
  sales: "线索跟进", diagnosis: "诊断复核", delivery: "交付验收",
  quote: "报价确认", ops: "内部运营", product: "产品搭建", feishu: "飞书集成"
};

function taskToFields(task: StartupTask): Record<string, unknown> {
  return {
    [FIELD_MAP.id]: task.id,
    [FIELD_MAP.title]: task.title,
    [FIELD_MAP.status]: STATUS_ZH[task.status],
    [FIELD_MAP.priority]: PRIORITY_ZH[task.priority],
    [FIELD_MAP.type]: TYPE_ZH[task.type] ?? task.type,
    [FIELD_MAP.assignee]: task.assigneeUserId ?? "",
    [FIELD_MAP.reviewer]: task.reviewerUserId ?? "",
    [FIELD_MAP.outcome]: task.outcome,
    [FIELD_MAP.riskFlags]: task.riskFlags.join(", "),
    ...(task.dueAt ? { [FIELD_MAP.dueAt]: new Date(task.dueAt).getTime() } : {}),
    ...(task.blockedReason ? { [FIELD_MAP.blockedReason]: task.blockedReason } : {}),
    [FIELD_MAP.createdAt]: new Date(task.createdAt).getTime(),
    [FIELD_MAP.updatedAt]: new Date(task.updatedAt).getTime()
  };
}

/**
 * Upsert a task record in Bitable.
 * If the task already has a bitableRecordId, PATCH it. Otherwise, POST a new record
 * and return the new record_id so it can be stored back on the task.
 */
export async function upsertBitableRecord(
  task: StartupTask,
  config = getFeishuConfig()
): Promise<string | null> {
  if (!isBitableConfigured()) return null;

  const token = await getTenantAccessToken(config);
  const fields = taskToFields(task);

  if (task.feishu.bitableRecordId) {
    // Update existing record
    await fetch(
      `${FEISHU_BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${task.feishu.bitableRecordId}`,
      {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ fields })
      }
    );
    return task.feishu.bitableRecordId;
  } else {
    // Create new record
    const res = await fetch(
      `${FEISHU_BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ fields })
      }
    );
    const json = (await res.json()) as { code?: number; data?: { record?: { record_id?: string } } };
    return json.data?.record?.record_id ?? null;
  }
}

/**
 * Batch sync all tasks to Bitable.
 * Useful for initial setup or recovery after a gap.
 */
export async function syncAllTasksToBitable(
  tasks: StartupTask[],
  config = getFeishuConfig()
): Promise<{ synced: number; errors: number }> {
  if (!isBitableConfigured()) return { synced: 0, errors: 0 };

  const token = await getTenantAccessToken(config);
  const records = tasks.map((t) => ({ fields: taskToFields(t) }));

  // Bitable supports batch create up to 500 records
  const chunks: Array<typeof records> = [];
  for (let i = 0; i < records.length; i += 500) {
    chunks.push(records.slice(i, i + 500));
  }

  let synced = 0;
  let errors = 0;
  for (const chunk of chunks) {
    try {
      const res = await fetch(
        `${FEISHU_BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/batch_create`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ records: chunk })
        }
      );
      const json = (await res.json()) as { code?: number; data?: { records?: unknown[] } };
      if (json.code === 0) synced += json.data?.records?.length ?? 0;
      else errors += chunk.length;
    } catch {
      errors += chunk.length;
    }
  }
  return { synced, errors };
}
