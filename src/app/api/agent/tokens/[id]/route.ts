import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTokenSummariesForMember, revokeAgentTokenForMember, verifyFeishuSessionProof } from "@/lib/agent/auth";
import { agentSessionProofSchema } from "@/lib/validation";
import { getKanbanStore } from "@/lib/store";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = agentSessionProofSchema.parse(await request.json());
    const store = getKanbanStore();
    const current = await store.read();
    const member = await verifyFeishuSessionProof(current, payload);
    const board = await store.update((state) => revokeAgentTokenForMember(state, member.id, id));
    const refreshedMember = board.team.find((item) => item.id === member.id);
    return NextResponse.json({
      success: true,
      data: {
        tokens: refreshedMember ? getTokenSummariesForMember(refreshedMember) : []
      }
    });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "吊销参数不完整。"
      : error instanceof Error ? error.message : "吊销 token 失败。";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
