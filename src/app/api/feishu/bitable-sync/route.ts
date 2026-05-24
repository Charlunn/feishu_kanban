import { NextResponse } from "next/server";
import { getKanbanStore } from "@/lib/store";
import { syncAllTasksToBitable, isBitableConfigured } from "@/lib/feishu/bitable";

/**
 * POST /api/feishu/bitable-sync
 * Full re-sync of all tasks to Feishu Bitable (useful for initial setup).
 */
export async function POST() {
  if (!isBitableConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: "Bitable not configured. Set FEISHU_BITABLE_APP_TOKEN and FEISHU_BITABLE_TABLE_ID."
    });
  }
  const board = await getKanbanStore().read();
  const result = await syncAllTasksToBitable(board.tasks);
  return NextResponse.json({ ...result, total: board.tasks.length });
}
