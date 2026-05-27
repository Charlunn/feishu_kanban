import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { claimTask } from "@/domain/operations";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { getKanbanStore } from "@/lib/store";
import { claimTaskSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = claimTaskSchema.parse(await request.json());
    const board = await getKanbanStore().update((state) => claimTask(state, id, payload.memberId));
    return NextResponse.json({ board: sanitizeBoardForClient(board) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "领取参数不完整。" }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "领取失败。" }, { status: 400 });
  }
}
