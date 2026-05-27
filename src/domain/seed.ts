import type { StartupBoardState, TeamMember } from "./models.ts";
import { DEFAULT_ROLES } from "./permissions.ts";

export const demoTeam: TeamMember[] = [
  {
    id: "member_founder",
    name: "预览创始人",
    roleLabel: "创始人",
    feishuOpenId: "ou_preview_founder_demo",
    roleId: "role_founder",
    permissions: ["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"],
    mode: "available" as const,
    maxActiveTasks: 2,
    skills: ["sales", "diagnosis", "delivery", "quote", "ops", "product", "feishu"]
  },
  {
    id: "member_operator",
    name: "预览执行",
    roleLabel: "普通员工",
    feishuOpenId: "ou_preview_operator_demo",
    roleId: "role_employee",
    permissions: [],
    mode: "available" as const,
    maxActiveTasks: 2,
    skills: ["sales", "diagnosis", "delivery", "quote", "ops", "product", "feishu"]
  }
];
export const demoTasks = [];

export const demoState: StartupBoardState = {
  roles: DEFAULT_ROLES,
  team: demoTeam,
  tasks: [],
  auditLogs: [],
  feishu: {
    appName: "点栈 KANBAN",
    defaultChatId: "",
    webAppUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
    bitableMirrorEnabled: false,
    botEnabled: true
  }
};
