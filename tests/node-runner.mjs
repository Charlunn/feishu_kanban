import assert from "node:assert/strict";
import {
  approveDone,
  blockTask,
  claimTask,
  createTask,
  getBoardSummary,
  moveTaskByAction,
  moveTaskByDrop,
  releaseTask,
  requestReview,
  requiresIndependentReview,
  startTask,
  suggestNextTaskForMember
} from "../src/domain/operations.ts";
import { demoState } from "../src/domain/seed.ts";
import { buildBoardDigestCard, buildTaskCard } from "../src/lib/feishu/cards.ts";
import { normalizeFeishuCardAction, resolveFeishuChallenge } from "../src/lib/feishu/events.ts";

const base = {
  ...JSON.parse(JSON.stringify(demoState)),
  team: [
    {
      id: "member_founder",
      name: "Founder",
      roleLabel: "创始人",
      feishuOpenId: "ou_founder_real",
      roleId: "role_founder",
      permissions: ["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"],
      mode: "available",
      maxActiveTasks: 2,
      skills: ["sales", "diagnosis", "delivery", "ops", "product", "feishu"]
    },
    {
      id: "member_reviewer",
      name: "Reviewer",
      roleLabel: "普通员工",
      feishuOpenId: "ou_reviewer_real",
      roleId: "role_employee",
      permissions: [],
      mode: "available",
      maxActiveTasks: 2,
      skills: ["sales", "diagnosis", "delivery", "ops", "product", "feishu"]
    }
  ]
};

assert.equal(demoState.team.length, 0);
assert.equal(demoState.tasks.length, 0);
assert.equal(base.team.length, 2);
assert.equal(getBoardSummary(base).total, 0);

const created = createTask(
  base,
  {
    title: "给官网诊断报告加飞书入口",
    type: "feishu",
    priority: "high",
    outcome: "报告复核完成后自动出现内部跟进任务。",
    acceptanceCriteria: ["生成任务", "生成卡片", "写入审计"],
    riskFlags: ["ai_output"]
  },
  "member_founder",
  "2026-05-21T04:00:00.000Z"
);
const newTask = created.tasks[0];
assert.equal(newTask.status, "ready");
assert.equal(created.auditLogs[0].action, "create_task");

const claimed = claimTask(created, newTask.id, "member_founder", "2026-05-21T04:01:00.000Z");
assert.equal(claimed.tasks[0].status, "claimed");
assert.equal(claimed.tasks[0].assigneeUserId, "member_founder");

const started = startTask(claimed, newTask.id, "member_founder", "2026-05-21T04:02:00.000Z");
assert.equal(started.tasks[0].status, "doing");

const review = requestReview(started, newTask.id, "member_founder", "2026-05-21T04:03:00.000Z");
assert.equal(review.tasks[0].status, "review");
assert.notEqual(review.tasks[0].reviewerUserId, "member_founder");
assert.equal(requiresIndependentReview(review.tasks[0]), true);

assert.throws(() => approveDone(review, newTask.id, "member_founder"), /require review by another member/);
const done = approveDone(review, newTask.id, review.tasks[0].reviewerUserId, "2026-05-21T04:04:00.000Z");
assert.equal(done.tasks[0].status, "done");
assert.ok(done.tasks[0].completedAt);
assert.ok(suggestNextTaskForMember(created, "member_reviewer"));

const blocked = blockTask(claimed, newTask.id, "member_founder", "等待飞书应用凭证", "2026-05-21T04:05:00.000Z");
assert.equal(blocked.tasks[0].status, "blocked");
assert.match(blocked.tasks[0].blockedReason, /凭证/);
const released = releaseTask(blocked, newTask.id, "member_founder", "2026-05-21T04:06:00.000Z");
assert.equal(released.tasks[0].status, "ready");
assert.equal(released.tasks[0].assigneeUserId, undefined);

const moved = moveTaskByAction(created, newTask.id, "member_founder", "claim_task", "", "2026-05-21T04:07:00.000Z");
assert.equal(moved.tasks[0].status, "claimed");

const dropClaimed = moveTaskByDrop(created, newTask.id, "member_founder", "claimed", "", "2026-05-21T04:08:00.000Z");
assert.equal(dropClaimed.tasks[0].status, "claimed");
const dropDoing = moveTaskByDrop(dropClaimed, newTask.id, "member_founder", "doing", "", "2026-05-21T04:09:00.000Z");
assert.equal(dropDoing.tasks[0].status, "doing");
const dropReview = moveTaskByDrop(dropDoing, newTask.id, "member_founder", "review", "", "2026-05-21T04:10:00.000Z");
assert.equal(dropReview.tasks[0].status, "review");
assert.throws(() => moveTaskByDrop(dropReview, newTask.id, "member_founder", "done"), /require review by another member/);

const card = buildTaskCard(newTask, "https://example.feishu-app.local");
assert.equal(card.config.wide_screen_mode, true);
assert.ok(JSON.stringify(card).includes("claim_task"));
assert.ok(JSON.stringify(card).includes("打开看板"));

const digest = buildBoardDigestCard(base);
assert.ok(JSON.stringify(digest).includes("今日任务摘要"));
assert.ok(JSON.stringify(digest).includes("打开飞书内嵌工作台"));

const challenge = resolveFeishuChallenge({ challenge: "abc", token: "token" }, "token");
assert.deepEqual(challenge, { challenge: "abc" });
assert.throws(() => resolveFeishuChallenge({ challenge: "abc", token: "bad" }, "token"), /Invalid Feishu verification token/);

const action = normalizeFeishuCardAction({
  action: { value: { taskId: "task_1", action: "claim_task", note: "take it" } },
  operator: { open_id: "ou_builder_demo" }
});
assert.equal(action.taskId, "task_1");
assert.equal(action.action, "claim_task");
assert.equal(action.openId, "ou_builder_demo");

console.log("Feishu startup kanban tests passed.");
