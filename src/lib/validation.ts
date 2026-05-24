import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(80),
  type: z.enum(["sales", "diagnosis", "delivery", "ops", "product", "feishu"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  source: z
    .enum(["manual", "feishu_message", "feishu_card", "official_site_lead", "diagnosis_review", "quote_review", "delivery_followup"])
    .optional(),
  outcome: z.string().trim().min(4).max(300),
  context: z.string().trim().max(800).optional().default(""),
  acceptanceCriteria: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split("\n")))
    .transform((items) => items.map((item) => item.trim()).filter(Boolean))
    .refine((items) => items.length > 0 && items.length <= 6, "请写 1-6 条验收条件。"),
  riskFlags: z
    .array(z.enum(["customer_facing", "sensitive_data", "quote_scope", "ai_output", "ops_only"]))
    .optional()
    .default([]),
  dueAt: z.string().trim().optional(),
  linkHref: z.string().trim().max(300).optional().default(""),
  linkLabel: z.string().trim().max(40).optional().default(""),
  actorUserId: z.string().trim().min(1).default("member_founder")
});

export const claimTaskSchema = z.object({
  memberId: z.string().trim().min(1)
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

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
