import { NextResponse } from "next/server";
import { buildBoardDigestCard } from "@/lib/feishu/cards";
import { getFeishuConfig, sendInteractiveCard } from "@/lib/feishu/client";
import { getKanbanStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const storedBoard = await getKanbanStore().read();
    const board = {
      ...storedBoard,
      feishu: {
        ...storedBoard.feishu,
        webAppUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || origin
      }
    };
    const card = buildBoardDigestCard(board);
    const config = getFeishuConfig();
    const receiveId = config.defaultChatId || board.feishu.defaultChatId || "";
    if (!receiveId) {
      return NextResponse.json({ skipped: true, reason: "No Feishu chat id configured.", card });
    }
    const result = await sendInteractiveCard({ receiveIdType: "chat_id", receiveId, card }, config);
    return NextResponse.json({ card, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push digest failed." }, { status: 400 });
  }
}
