import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  buildAgentCapabilities,
  buildAgentIdentity,
  buildAgentSkillBundle,
  createAgentTokenForMember,
  getTokenSummariesForMember,
  verifyFeishuSessionProof
} from "@/lib/agent/auth";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { agentSessionProofSchema } from "@/lib/validation";
import { getKanbanStore } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const proof = agentSessionProofSchema.parse({
      memberId: url.searchParams.get("memberId"),
      accessToken: request.headers.get("x-feishu-access-token")
    });
    const board = await getKanbanStore().read();
    const member = await verifyFeishuSessionProof(board, proof);
    return NextResponse.json({
      success: true,
      data: {
        identity: buildAgentIdentity(member, board),
        capabilities: buildAgentCapabilities(member, board),
        tokens: getTokenSummariesForMember(member)
      }
    });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "登录校验参数不完整。"
      : error instanceof Error ? error.message : "获取 token 列表失败。";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = agentSessionProofSchema.parse(await request.json());
    const store = getKanbanStore();
    const current = await store.read();
    const member = await verifyFeishuSessionProof(current, payload);

    let issuedToken = "";
    let issuedTokenId = "";

    const board = await store.update((state) => {
      const target = state.team.find((item) => item.id === member.id);
      if (!target) throw new Error("成员不存在。");
      const created = createAgentTokenForMember(state, target.id, payload.name || "网页 AI Token");
      issuedToken = created.token;
      issuedTokenId = created.record.id;
      return created.board;
    });

    const refreshedMember = board.team.find((item) => item.id === member.id);
    if (!refreshedMember) throw new Error("成员不存在。");

    const tokenRecord = (refreshedMember.agentAccess?.tokens ?? []).find((item) => item.id === issuedTokenId);
    if (!tokenRecord || !issuedToken) throw new Error("Token 创建失败。");

    const skill = buildAgentSkillBundle(refreshedMember, board, issuedToken);

    return NextResponse.json({
      success: true,
      data: {
        board: sanitizeBoardForClient(board),
        token: issuedToken,
        tokenRecord: {
          id: tokenRecord.id,
          name: tokenRecord.name,
          tokenPreview: tokenRecord.tokenPreview,
          createdAt: tokenRecord.createdAt
        },
        tokens: getTokenSummariesForMember(refreshedMember),
        skill,
        cliDownloadPath: skill.cliDownloadPath
      }
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues[0]?.message || "Token 创建参数不合法。"
      : error instanceof Error ? error.message : "Token 创建失败。";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
