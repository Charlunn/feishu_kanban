import { NextResponse } from "next/server";
import { getFeishuConfig, isFeishuConfigured, sendInteractiveCard } from "@/lib/feishu/client";
import { getKanbanStore } from "@/lib/store";
import { buildReminderCard } from "@/lib/feishu/cards";
import type { StartupTask } from "@/domain/models";

/**
 * 任务到期提醒接口
 *
 * 调用方式：
 * - 飞书定时任务（每小时调用一次）
 * - 或手动 POST /api/feishu/reminders
 *
 * 逻辑：
 * 1. 扫描所有未完成且设置了 dueAt 的任务
 * 2. 如果距离到期 ≤ 4 小时且尚未发送过提醒，向负责人推送飞书消息
 * 3. 如果已经超期，向负责人和创建者都推送
 * 4. 标记 reminderSentAt 避免重复推送
 */
export async function POST(request: Request) {
  try {
    const config = getFeishuConfig();
    const now = new Date();
    const store = getKanbanStore();
    const board = await store.read();

    const REMINDER_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
    const results: Array<{ taskId: string; title: string; status: string; notified: string[] }> = [];

    // Find tasks that need reminders
    const tasksNeedingReminder = board.tasks.filter((task) => {
      if (!task.dueAt) return false;
      if (task.status === "done") return false;
      if (task.reminderSentAt) {
        // Don't re-send within 4 hours
        const lastSent = new Date(task.reminderSentAt).getTime();
        if (now.getTime() - lastSent < REMINDER_THRESHOLD_MS) return false;
      }
      const dueTime = new Date(task.dueAt).getTime();
      const timeUntilDue = dueTime - now.getTime();
      // Remind if due within 4 hours or already overdue
      return timeUntilDue <= REMINDER_THRESHOLD_MS;
    });

    if (tasksNeedingReminder.length === 0) {
      return NextResponse.json({ message: "没有需要提醒的任务", reminders: [] });
    }

    const origin = process.env.NEXT_PUBLIC_APP_BASE_URL || new URL(request.url).origin;

    // Send reminders
    for (const task of tasksNeedingReminder) {
      const dueTime = new Date(task.dueAt!).getTime();
      const isOverdue = dueTime < now.getTime();
      const notified: string[] = [];

      // Notify assignee
      if (task.assigneeUserId) {
        const assignee = board.team.find((m) => m.id === task.assigneeUserId);
        if (assignee?.feishuOpenId) {
          const card = buildReminderCard(task, assignee.name, isOverdue, origin);
          if (isFeishuConfigured(config)) {
            await sendInteractiveCard({
              receiveIdType: "open_id",
              receiveId: assignee.feishuOpenId,
              card
            }, config);
          }
          notified.push(assignee.name);
        }
      }

      // If overdue, also notify creator
      if (isOverdue && task.createdByUserId !== task.assigneeUserId) {
        const creator = board.team.find((m) => m.id === task.createdByUserId);
        if (creator?.feishuOpenId) {
          const card = buildReminderCard(task, creator.name, isOverdue, origin);
          if (isFeishuConfigured(config)) {
            await sendInteractiveCard({
              receiveIdType: "open_id",
              receiveId: creator.feishuOpenId,
              card
            }, config);
          }
          notified.push(creator.name);
        }
      }

      results.push({
        taskId: task.id,
        title: task.title,
        status: isOverdue ? "overdue" : "approaching",
        notified
      });
    }

    // Mark reminderSentAt
    await store.update((state) => ({
      ...state,
      tasks: state.tasks.map((task) => {
        if (tasksNeedingReminder.some((t) => t.id === task.id)) {
          return { ...task, reminderSentAt: now.toISOString() };
        }
        return task;
      })
    }));

    return NextResponse.json({
      message: `已处理 ${results.length} 个任务提醒`,
      reminders: results,
      feishuConfigured: isFeishuConfigured(config)
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "提醒发送失败"
    }, { status: 500 });
  }
}
