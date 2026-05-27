import { z } from "zod";
import { RISK_FLAGS, TASK_PRIORITIES, TASK_SOURCES, TASK_TYPES } from "../domain/models.ts";

const requiredTrimmedString = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : value == null ? "" : String(value)),
    z.string().trim().min(min, minMessage).max(max, maxMessage)
  );

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : value == null ? "" : String(value)),
    z.string().trim().max(max)
  );

const acceptanceCriteriaSchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split("\n");
    if (value == null) return [];
    return value;
  }, z.array(z.string()))
  .transform((items) => items.map((item) => item.trim()).filter(Boolean))
  .refine((items) => items.length <= 6, "验收条件最多 6 条。");

export const createTaskSchema = z.object({
  title: requiredTrimmedString(2, 80, "任务标题至少 2 个字。", "任务标题最多 80 个字。"),
  type: z.enum(TASK_TYPES),
  priority: z.enum(TASK_PRIORITIES),
  source: z.enum(TASK_SOURCES).optional(),
  outcome: requiredTrimmedString(4, 300, "请写清楚完成标准。", "完成标准最多 300 个字。"),
  context: optionalTrimmedString(800).optional().default(""),
  acceptanceCriteria: acceptanceCriteriaSchema.default([]),
  riskFlags: z.array(z.enum(RISK_FLAGS)).optional().default([]),
  dueAt: optionalTrimmedString(80)
    .transform((value) => value || undefined)
    .optional(),
  linkHref: optionalTrimmedString(300).optional().default(""),
  linkLabel: optionalTrimmedString(40).optional().default(""),
  actorUserId: requiredTrimmedString(1, 120, "缺少派发人。", "派发人参数不合法。").default("member_founder")
});

export const claimTaskSchema = z.object({
  memberId: z.string().trim().min(1)
});

export const agentTaskDraftSchema = createTaskSchema.omit({
  actorUserId: true
});

export const moveTaskSchema = z.object({
  memberId: z.string().trim().min(1),
  action: z.enum(["claim_task", "start_task", "request_review", "approve_done", "block_task", "release_task", "reopen_task"]).optional(),
  targetStatus: z.enum(["pool", "ready", "claimed", "doing", "blocked", "review", "done"]).optional(),
  note: z.string().trim().max(300).optional().default("")
}).refine((value) => Boolean(value.action || value.targetStatus), {
  message: "需要提供动作或目标列。"
});

export const feishuChallengeSchema = z.object({
  type: z.string().optional(),
  challenge: z.string().optional(),
  token: z.string().optional()
});

export const feishuCardActionSchema = z
  .object({
    action: z
      .object({
        value: z
          .object({
            taskId: z.string().optional(),
            action: z.string().optional(),
            memberId: z.string().optional(),
            note: z.string().optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    operator: z
      .object({
        open_id: z.string().optional(),
        user_id: z.string().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export const agentTaskActionSchema = z.object({
  action: z.enum(["claim_task", "start_task", "request_review", "approve_done", "block_task", "release_task", "reopen_task"]).optional(),
  targetStatus: z.enum(["pool", "ready", "claimed", "doing", "blocked", "review", "done"]).optional(),
  note: z.string().trim().max(300).optional().default("")
}).refine((value) => Boolean(value.action || value.targetStatus), {
  message: "需要提供动作或目标列。"
});

export const agentTaskUpdateSchema = z.object({
  title: requiredTrimmedString(2, 80, "任务标题至少 2 个字。", "任务标题最多 80 个字。").optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  outcome: requiredTrimmedString(4, 300, "请写清楚完成标准。", "完成标准最多 300 个字。").optional(),
  context: optionalTrimmedString(800).optional(),
  acceptanceCriteria: acceptanceCriteriaSchema.optional(),
  riskFlags: z.array(z.enum(RISK_FLAGS)).optional(),
  dueAt: optionalTrimmedString(80).transform((value) => value || undefined).optional(),
  linkHref: optionalTrimmedString(300).optional(),
  linkLabel: optionalTrimmedString(40).optional(),
  blockedReason: optionalTrimmedString(300).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "至少提供一个要更新的字段。"
});

export const agentSessionProofSchema = z.object({
  memberId: z.string().trim().min(1),
  accessToken: z.string().trim().min(1),
  name: z.string().trim().min(1).max(60).optional()
});

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
