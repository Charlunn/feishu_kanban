import { NextResponse } from "next/server";
import { buildAgentApiSchema } from "@/lib/agent/auth";
import { withAgentSession } from "@/lib/agent/request";

export async function GET(request: Request) {
  try {
    await withAgentSession(request);
    return NextResponse.json({
      success: true,
      data: buildAgentApiSchema()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent auth failed." },
      { status: 401 }
    );
  }
}
