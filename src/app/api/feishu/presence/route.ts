import { NextResponse } from "next/server";
import { getKanbanStore } from "@/lib/store";
import { getUserPresence, isFeishuConfigured } from "@/lib/feishu/client";

/**
 * GET /api/feishu/presence
 * Returns current presence status for all team members.
 * Maps feishuOpenId → status (active | meeting | away | out_of_office | unknown)
 */
export async function GET() {
  const board = await getKanbanStore().read();
  const openIds = board.team.map((m) => m.feishuOpenId).filter(Boolean);

  if (!isFeishuConfigured() || openIds.length === 0) {
    // Return mock presence data in preview mode
    const mockPresence = Object.fromEntries(
      board.team.map((m) => [m.feishuOpenId, m.mode === "away" ? "away" : "active"])
    );
    return NextResponse.json({ presence: mockPresence, mock: true });
  }

  try {
    const presenceList = await getUserPresence(openIds);
    const presence = Object.fromEntries(
      presenceList.map((p) => [p.openId, p.status])
    );
    return NextResponse.json({ presence });
  } catch {
    return NextResponse.json({ presence: {}, error: "presence fetch failed" });
  }
}
