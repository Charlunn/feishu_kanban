import type { StartupBoardState, StartupTask, TeamMember } from "./models.ts";
import { DEFAULT_ROLES } from "./permissions.ts";

const now = "2026-05-21T03:45:00.000Z";

export const demoTeam: TeamMember[] = [
  {
    id: "member_founder",
    name: "负责人",
    roleLabel: "派活 / 客户判断 / 最终口径",
    feishuOpenId: "ou_founder_demo",
    roleId: "role_founder",
    permissions: ["create_task", "manage_team"],
    mode: "available",
    maxActiveTasks: 2,
    skills: ["sales", "diagnosis", "delivery", "ops", "product", "feishu"]
  },
  {
    id: "member_builder",
    name: "搭建手",
    roleLabel: "系统搭建 / 自动化 / 文档",
    feishuOpenId: "ou_builder_demo",
    roleId: "role_employee",
    permissions: [],
    mode: "available",
    maxActiveTasks: 2,
    skills: ["product", "feishu", "delivery", "diagnosis"]
  },
  {
    id: "member_operator",
    name: "运营手",
    roleLabel: "线索跟进 / 资料整理 / 复核",
    feishuOpenId: "ou_operator_demo",
    roleId: "role_employee",
    permissions: [],
    mode: "reviewing",
    maxActiveTasks: 2,
    skills: ["sales", "ops", "delivery", "diagnosis"]
  }
];

export const demoTasks: StartupTask[] = [
  task({
    id: "task_checkup_review",
    title: "复核最新免费诊断线索并给出下一步",
    status: "ready",
    type: "diagnosis",
    priority: "urgent",
    source: "official_site_lead",
    createdByUserId: "member_founder",
    outcome: "把客户是否适合进入深度诊断讲清楚，并形成飞书跟进卡片。",
    context: "来自官网 AI 流程诊断表，需要先确认敏感资料边界和评分是否合理。",
    acceptanceCriteria: ["补齐一句话判断", "确认评分和 ROI 假设没有夸大", "写出下一步私域沟通口径"],
    riskFlags: ["customer_facing", "ai_output"],
    dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    links: [{ label: "官网线索详情", href: "/official-site/admin/leads/demo", surface: "official_site" }]
  }),
  task({
    id: "task_feishu_card",
    title: "把看板每日摘要推到飞书群",
    status: "claimed",
    type: "feishu",
    priority: "high",
    source: "manual",
    createdByUserId: "member_founder",
    assigneeUserId: "member_builder",
    outcome: "每天早上在内部群看到待领取、进行中、待复核和阻塞任务。",
    context: "先用企业自建应用机器人发送交互式卡片，不接复杂审批。",
    acceptanceCriteria: ["摘要卡片包含 4 个核心数字", "卡片能打开内嵌工作台", "接口在未配置凭证时返回可预览 payload"],
    riskFlags: ["ops_only"]
  }),
  task({
    id: "task_quote_boundary",
    title: "整理首个试点报价边界",
    status: "doing",
    type: "sales",
    priority: "high",
    source: "quote_review",
    createdByUserId: "member_founder",
    assigneeUserId: "member_operator",
    startedAt: now,
    outcome: "形成 8000-30000 元试点报价区间的包含项和排除项。",
    context: "要避免客户把诊断装机单理解成无限范围项目。",
    acceptanceCriteria: ["包含项不超过 6 条", "排除项写清外部系统和敏感资料", "给出验收口径"],
    riskFlags: ["customer_facing", "quote_scope"],
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }),
  task({
    id: "task_doc_template",
    title: "补一版交付文件夹模板",
    status: "review",
    type: "delivery",
    priority: "normal",
    source: "delivery_followup",
    createdByUserId: "member_builder",
    assigneeUserId: "member_builder",
    reviewerUserId: "member_operator",
    reviewRequestedAt: now,
    outcome: "飞书云文档里有固定的客户交付目录结构。",
    context: "只做内部模板，不自动收客户敏感文件。",
    acceptanceCriteria: ["目录包含诊断、材料、草稿、复核、验收、维护", "模板中有敏感资料提醒", "链接能挂到任务卡"],
    riskFlags: ["customer_facing"]
  }),
  task({
    id: "task_customer_script",
    title: "写 15 分钟诊断回访话术",
    status: "blocked",
    type: "sales",
    priority: "normal",
    source: "manual",
    createdByUserId: "member_operator",
    assigneeUserId: "member_operator",
    outcome: "让客户理解我们卖的是诊断和轻量工作流落地，不是泛 AI 工具。",
    context: "缺少一个真实客户行业例子，先阻塞。",
    acceptanceCriteria: ["开场 1 分钟", "诊断解释 5 分钟", "下一步邀请 3 分钟", "边界说明 2 分钟"],
    riskFlags: ["customer_facing"],
    blockedReason: "等待负责人确认优先行业案例。"
  }),
  task({
    id: "task_scope_note",
    title: "把敏感资料提醒放进任务创建规范",
    status: "done",
    type: "ops",
    priority: "normal",
    source: "manual",
    createdByUserId: "member_founder",
    assigneeUserId: "member_operator",
    reviewerUserId: "member_founder",
    completedAt: now,
    outcome: "团队在派任务时不会默认要求客户上传身份证、银行卡、合同原件等资料。",
    context: "对应公司 AI 合规边界。",
    acceptanceCriteria: ["列出默认不收的数据类型", "说明付费和 NDA 后才可少量收集", "在看板 UI 中可见"],
    riskFlags: ["sensitive_data", "ops_only"]
  })
];

export const demoState: StartupBoardState = {
  roles: DEFAULT_ROLES,
  team: demoTeam,
  tasks: demoTasks,
  auditLogs: [],
  feishu: {
    appName: "AI交付战情看板",
    defaultChatId: "oc_demo_internal_team",
    webAppUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
    bitableMirrorEnabled: true,
    botEnabled: true
  }
};

function task(input: Omit<StartupTask, "feishu" | "createdAt" | "updatedAt" | "workLog" | "links" | "riskFlags" | "acceptanceCriteria" | "dueAt" | "reminderSentAt"> & {
  links?: StartupTask["links"];
  riskFlags?: StartupTask["riskFlags"];
  acceptanceCriteria: string[];
  dueAt?: string;
}): StartupTask {
  return {
    ...input,
    riskFlags: input.riskFlags || [],
    links: input.links || [],
    dueAt: input.dueAt,
    feishu: {
      chatId: "oc_demo_internal_team",
      deepLink: `/tasks/${input.id}`
    },
    createdAt: now,
    updatedAt: now,
    workLog: [
      {
        id: `log_${input.id}_created`,
        at: now,
        actorUserId: input.createdByUserId,
        action: "create_task",
        note: "种子任务。"
      }
    ]
  };
}
