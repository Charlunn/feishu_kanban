import type { StartupBoardState } from "./models.ts";
import { DEFAULT_ROLES } from "./permissions.ts";

export const demoTeam = [];
export const demoTasks = [];

export const demoState: StartupBoardState = {
  roles: DEFAULT_ROLES,
  team: [],
  tasks: [],
  auditLogs: [],
  feishu: {
    appName: "DOTSTACK 点绽交付台",
    defaultChatId: "",
    webAppUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
    bitableMirrorEnabled: false,
    botEnabled: true
  }
};
