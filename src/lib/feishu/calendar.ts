/**
 * 飞书日历集成 — 快速预约会议讨论任务
 *
 * API: POST /open-apis/calendar/v4/calendars/{calendar_id}/events
 * 文档: https://open.feishu.cn/document/server-docs/calendar-v4/calendar-event/create
 */

import { getFeishuConfig, getTenantAccessToken, isFeishuConfigured } from "./client";
import type { StartupTask, TeamMember } from "../../domain/models";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

export interface CreateMeetingInput {
  task: StartupTask;
  organizer: TeamMember;
  attendees: TeamMember[];
  /** ISO string, defaults to 30 min from now */
  startTime?: string;
  /** Duration in minutes, defaults to 15 */
  durationMinutes?: number;
  /** Additional note for the meeting */
  note?: string;
}

export interface MeetingResult {
  skipped: boolean;
  eventId?: string;
  meetingUrl?: string;
  preview?: Record<string, unknown>;
}

/**
 * 创建飞书日历事件（会议）
 * 用于任务讨论：阻塞原因讨论、复核会议、方案对齐等
 */
export async function createTaskMeeting(input: CreateMeetingInput): Promise<MeetingResult> {
  const config = getFeishuConfig();
  const {
    task,
    organizer,
    attendees,
    startTime,
    durationMinutes = 15,
    note
  } = input;

  const start = startTime ? new Date(startTime) : new Date(Date.now() + 30 * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const summary = `【点栈协同】${task.title}`;
  const description = [
    `任务：${task.title}`,
    `目标：${task.outcome}`,
    task.blockedReason ? `阻塞原因：${task.blockedReason}` : "",
    note ? `备注：${note}` : "",
    `发起人：${organizer.name}`,
    "",
    "— 由点栈 KANBAN 自动创建"
  ].filter(Boolean).join("\n");

  const attendeeList = attendees
    .filter((m) => m.feishuOpenId && m.id !== organizer.id)
    .map((m) => ({ type: "user", user_id: m.feishuOpenId, is_optional: false }));

  const eventPayload = {
    summary,
    description,
    start_time: { timestamp: Math.floor(start.getTime() / 1000).toString() },
    end_time: { timestamp: Math.floor(end.getTime() / 1000).toString() },
    attendee_ability: "can_modify_event",
    vchat: { vc_type: "vc", meeting_settings: { auto_record: false } },
    attendees: attendeeList
  };

  if (!isFeishuConfigured(config)) {
    return {
      skipped: true,
      preview: {
        summary,
        description,
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: attendees.map((m) => m.name),
        payload: eventPayload
      }
    };
  }

  const token = await getTenantAccessToken(config);

  // Use primary calendar
  const calendarId = "primary";
  const response = await fetch(
    `${FEISHU_BASE_URL}/calendar/v4/calendars/${calendarId}/events?user_id_type=open_id`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(eventPayload)
    }
  );

  const json = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: {
      event?: {
        event_id?: string;
        vchat?: { meeting_url?: string };
      };
    };
  };

  if (!response.ok || json.code !== 0) {
    throw new Error(`创建会议失败: ${json.msg || response.statusText}`);
  }

  return {
    skipped: false,
    eventId: json.data?.event?.event_id,
    meetingUrl: json.data?.event?.vchat?.meeting_url
  };
}

/**
 * 生成飞书日历 deep link（不调用 API，直接跳转飞书日历创建页）
 * 适用于无 calendar 权限时的降级方案
 */
export function buildCalendarDeepLink(task: StartupTask, attendees: TeamMember[]): string {
  const summary = encodeURIComponent(`【看板讨论】${task.title}`);
  const desc = encodeURIComponent(`任务目标：${task.outcome}`);
  // Feishu applink for creating calendar event
  return `https://applink.feishu.cn/client/calendar/event/create?summary=${summary}&description=${desc}`;
}
