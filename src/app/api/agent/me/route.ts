import { NextResponse } from "next/server";
import { buildAgentApiSchema, buildAgentCapabilities, buildAgentIdentity } from "@/lib/agent/auth";
import { withAgentSession } from "@/lib/agent/request";

export async function GET(request: Request) {
  try {
    const { board, member } = await withAgentSession(request);
    return NextResponse.json({
      success: true,
      data: {
        identity: buildAgentIdentity(member, board),
        capabilities: buildAgentCapabilities(member, board),
        schema: buildAgentApiSchema()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent auth failed." },
      { status: 401 }
    );
  }
}
