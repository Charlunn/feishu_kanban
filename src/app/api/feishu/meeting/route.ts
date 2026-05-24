import { NextResponse } from "next/server";
import { getKanbanStore } from "@/lib/store";
import { createTaskMeeting, buildCalendarDeepLink } from "@/lib/feishu/calendar";
import { z } from "zod";

const meetingSchema = z.object({
  taskId: z.string().min(1),
  organizerId: z.string().min(1),
  attendeeIds: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  durationMinutes: z.number().min(5).max(120).optional(),
  note: z.string().max(200).optional()
});

/**
 * POST /api/feishu/meeting
 * 为某个任务快速预约飞书会议
 */
export async function POST(request: Request) {
  try {
    const payload = meetingSchema.parse(await request.json());
    const board = await getKanbanStore().read();

    const task = board.tasks.find((t) => t.id === payload.taskId);
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const organizer = board.team.find((m) => m.id === payload.organizerId);
    if (!organizer) {
      return NextResponse.json({ error: "发起人不存在" }, { status: 404 });
    }

    // Default attendees: all team members except organizer
    const attendeeIds = payload.attendeeIds || board.team.map((m) => m.id);
    const attendees = board.team.filter((m) => attendeeIds.includes(m.id));

    const result = await createTaskMeeting({
      task,
      organizer,
      attendees,
      startTime: payload.startTime,
      durationMinutes: payload.durationMinutes,
      note: payload.note
    });

    // Also provide deep link as fallback
    const deepLink = buildCalendarDeepLink(task, attendees);

    return NextResponse.json({
      ...result,
      deepLink,
      task: { id: task.id, title: task.title }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "创建会议失败"
    }, { status: 500 });
  }
}
