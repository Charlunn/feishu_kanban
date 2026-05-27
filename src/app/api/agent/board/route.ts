import { NextResponse } from "next/server";
import { getBoardSummary } from "@/domain/operations";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { withAgentSession } from "@/lib/agent/request";

export async function GET(request: Request) {
  try {
    const { board } = await withAgentSession(request);
    const safeBoard = sanitizeBoardForClient(board);
    return NextResponse.json({
      success: true,
      data: {
        board: safeBoard,
        summary: getBoardSummary(safeBoard)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent auth failed." },
      { status: 401 }
    );
  }
}
