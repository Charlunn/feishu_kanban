import { NextResponse } from "next/server";
import { getFeishuConfig, getTenantAccessToken, isFeishuConfigured } from "@/lib/feishu/client";
import { getKanbanStore } from "@/lib/store";
import type { FeishuUserSession, StartupBoardState, TeamMember } from "@/domain/models";
import { ALL_PERMISSIONS, DEFAULT_ROLES, memberPermissions } from "@/domain/permissions";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

type FeishuLoginProfile = {
  open_id?: string;
  union_id?: string;
  name?: string;
  avatar_url?: string;
};

function memberIdFromOpenId(openId: string): string {
  return `member_${openId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 36)}`;
}

function hasRealFeishuAccount(member: TeamMember): boolean {
  return Boolean(member.feishuOpenId && !member.feishuOpenId.endsWith("_demo"));
}

function removeDemoData(state: StartupBoardState): StartupBoardState {
  const demoMemberIds = new Set(
    state.team
      .filter((member) => member.feishuOpenId?.endsWith("_demo"))
      .map((member) => member.id)
  );

  return {
    ...state,
    roles: state.roles?.length ? state.roles : DEFAULT_ROLES,
    team: state.team.filter((member) => !demoMemberIds.has(member.id)),
    tasks: state.tasks.filter((task) =>
      !demoMemberIds.has(task.createdByUserId)
      && (!task.assigneeUserId || !demoMemberIds.has(task.assigneeUserId))
      && (!task.reviewerUserId || !demoMemberIds.has(task.reviewerUserId))
    )
  };
}

function shouldGrantFounder(state: StartupBoardState, openId: string): boolean {
  const configuredOwnerOpenId = process.env.FEISHU_OWNER_OPEN_ID?.trim();
  if (configuredOwnerOpenId) return configuredOwnerOpenId === openId;

  const hasFounderOrAdmin = state.team.some((member) =>
    hasRealFeishuAccount(member) && memberPermissions(member, state).includes("manage_team")
  );
  return !hasFounderOrAdmin && !state.team.some(hasRealFeishuAccount);
}

async function getUserInfo(accessToken: string): Promise<FeishuLoginProfile> {
  const response = await fetch(`${FEISHU_BASE_URL}/authen/v1/user_info`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  const json = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: FeishuLoginProfile & {
      sub?: string;
      avatar_thumb?: string;
      avatar_middle?: string;
      avatar_big?: string;
    };
  };

  if (!response.ok || json.code !== 0 || !json.data) {
    throw new Error(`获取飞书用户信息失败: ${json.msg || response.statusText}`);
  }

  return {
    open_id: json.data.open_id || json.data.sub,
    union_id: json.data.union_id,
    name: json.data.name,
    avatar_url: json.data.avatar_url || json.data.avatar_middle || json.data.avatar_thumb || json.data.avatar_big
  };
}

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "缺少授权码 code" }, { status: 400 });
    }

    const config = getFeishuConfig();
    if (!isFeishuConfigured(config)) {
      return NextResponse.json({
        error: "飞书应用未配置，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET",
        fallback: true
      }, { status: 503 });
    }

    const tokenRes = await fetch(`${FEISHU_BASE_URL}/authen/v1/oidc/access_token`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await getTenantAccessToken(config)}`
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code
      })
    });

    const tokenJson = (await tokenRes.json()) as {
      code?: number;
      msg?: string;
      data?: {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        open_id?: string;
        union_id?: string;
        name?: string;
        avatar_url?: string;
      };
    };

    if (tokenJson.code !== 0 || !tokenJson.data?.access_token) {
      return NextResponse.json({
        error: `飞书登录失败: ${tokenJson.msg || "未知错误"}`,
        fallback: true
      }, { status: 401 });
    }

    const { access_token, refresh_token, expires_in } = tokenJson.data;
    let open_id = tokenJson.data.open_id;
    let union_id = tokenJson.data.union_id;
    let name = tokenJson.data.name;
    let avatar_url = tokenJson.data.avatar_url;

    if (!open_id) {
      const userInfo = await getUserInfo(access_token);
      open_id = userInfo.open_id;
      union_id = union_id || userInfo.union_id;
      name = name || userInfo.name;
      avatar_url = avatar_url || userInfo.avatar_url;
    }

    if (!open_id) {
      return NextResponse.json({
        error: "飞书登录成功，但无法从飞书用户信息中获取 open_id",
        fallback: true
      }, { status: 401 });
    }

    const now = new Date().toISOString();
    const displayName = name || "飞书成员";

    const store = getKanbanStore();
    const board = await store.update((state) => {
      const cleanedState = removeDemoData(state);
      const existing = cleanedState.team.find((member) => member.feishuOpenId === open_id);
      const founder = shouldGrantFounder(cleanedState, open_id);
      const roleId = founder ? "role_founder" : "role_employee";
      const roleLabel = founder ? "创始人" : "普通员工";
      const permissions = founder ? ALL_PERMISSIONS : [];

      if (existing) {
        return {
          ...cleanedState,
          team: cleanedState.team.map((member) =>
            member.id === existing.id
              ? {
                  ...member,
                  name: displayName,
                  roleLabel: founder ? roleLabel : member.roleLabel || roleLabel,
                  feishuOpenId: open_id,
                  feishuUnionId: union_id || member.feishuUnionId,
                  avatarUrl: avatar_url || member.avatarUrl,
                  lastLoginAt: now,
                  roleId: founder ? roleId : member.roleId || roleId,
                  permissions: founder ? permissions : member.permissions || []
                }
              : member
          )
        };
      }

      const newMember: TeamMember = {
        id: memberIdFromOpenId(open_id),
        name: displayName,
        roleLabel,
        feishuOpenId: open_id,
        feishuUnionId: union_id,
        avatarUrl: avatar_url,
        lastLoginAt: now,
        roleId,
        permissions,
        mode: "available",
        maxActiveTasks: 2,
        skills: ["sales", "diagnosis", "delivery", "quote", "ops", "product", "feishu"]
      };

      return {
        ...cleanedState,
        team: [...cleanedState.team, newMember]
      };
    });

    const member = board.team.find((item) => item.feishuOpenId === open_id);
    if (!member) {
      return NextResponse.json({
        error: "飞书账号登录成功，但用户档案写入失败，请刷新后重试。",
        fallback: true
      }, { status: 500 });
    }

    const session: FeishuUserSession = {
      openId: open_id,
      unionId: union_id,
      name: name || member.name,
      avatarUrl: avatar_url,
      memberId: member.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + (expires_in || 7200) * 1000).toISOString()
    };

    return NextResponse.json({ session, member, board });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "登录失败",
      fallback: true
    }, { status: 500 });
  }
}
