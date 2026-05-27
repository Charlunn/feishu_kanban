import { getBoardSummary } from "@/domain/operations";
import { sanitizeBoardForClient } from "@/lib/agent/state";
import { getKanbanStore } from "@/lib/store";
import { isFeishuConfigured } from "@/lib/feishu/client";
import { KanbanApp } from "./_components/KanbanApp";

export default async function HomePage() {
  const board = await getKanbanStore().read();
  const safeBoard = sanitizeBoardForClient(board);
  const summary = getBoardSummary(safeBoard);
  const feishuReady = isFeishuConfigured();

  return (
    <KanbanApp
      initialState={safeBoard}
      initialSummary={summary}
      feishuReady={feishuReady}
    />
  );
}
