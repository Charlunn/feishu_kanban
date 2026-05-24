import { getBoardSummary } from "@/domain/operations";
import { getKanbanStore } from "@/lib/store";
import { isFeishuConfigured } from "@/lib/feishu/client";
import { KanbanApp } from "./_components/KanbanApp";

export default async function HomePage() {
  const board = await getKanbanStore().read();
  const summary = getBoardSummary(board);
  const feishuReady = isFeishuConfigured();

  return (
    <KanbanApp
      initialState={board}
      initialSummary={summary}
      feishuReady={feishuReady}
    />
  );
}
