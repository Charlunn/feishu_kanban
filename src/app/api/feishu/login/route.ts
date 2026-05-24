import { NextResponse } from "next/server";
import { getFeishuConfig, isFeishuConfigured, getTenantAccessToken } from "@/lib/feishu/client";
import { getKanbanStore } from "@/lib/store";
import type { FeishuUserSession } from "@/domain/models";
import { findFounder } from "@/domain/permissions";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

/**
 * 飞书网页应用免登流程：
 * 1. 前端在飞书容器内调用 tt.requestAuthCode() 获取临时授权码 code
 * 2. 前端将 code POST 到此接口
 * 3. 后端用 code 换取 user_access_token，获取用户身份
 * 4. 匹配到 team member 后返回 session
 *
 * 如果不在飞书容器内（预览模式），前端可以直接选择身份，不走此接口。
 */
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

    // 用 code 换取 user_access_token
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

    const { access_token, refresh_token, expires_in, open_id, union_id, name, avatar_url } = tokenJson.data;
    const now = new Date().toISOString();

    const store = getKanbanStore();
    const board = await store.update((state) => {
      const demoMemberIds = new Set(
        state.team
          .filter((member) => member.feishuOpenId?.endsWith("_demo"))
          .map((member) => member.id)
      );
      const cleanedState = {
        ...state,
        team: state.team.filter((member) => !demoMemberIds.has(member.id)),
        tasks: state.tasks.filter((task) =>
          !demoMemberIds.has(task.createdByUserId)
          && (!task.assigneeUserId || !demoMemberIds.has(task.assigneeUserId))
          && (!task.reviewerUserId || !demoMemberIds.has(task.reviewerUserId))
        )
      };

      const existing = cleanedState.team.find((m) => m.feishuOpenId === open_id);
      if (existing && open_id) {
        return {
          ...cleanedState,
          team: cleanedState.team.map((member) =>
            member.id === existing.id
              ? {
                  ...member,
                  name: name || member.name,
                  feishuUnionId: union_id || member.feishuUnionId,
                  avatarUrl: avatar_url || member.avatarUrl,
                  lastLoginAt: now
                }
              : member
          )
        };
      }
      if (!open_id) return cleanedState;

      const configuredOwnerOpenId = process.env.FEISHU_OWNER_OPEN_ID?.trim();
      const founder = findFounder(cleanedState);
      const founderHasRealOpenId = Boolean(founder?.feishuOpenId && !founder.feishuOpenId.endsWith("_demo"));
      const shouldBecomeFounder = configuredOwnerOpenId
        ? configuredOwnerOpenId === open_id
        : !founderHasRealOpenId && cleanedState.team.length === 0;

      if (shouldBecomeFounder && founder) {
        return {
          ...cleanedState,
          team: cleanedState.team.map((member) =>
            member.id === founder.id
              ? {
                  ...member,
                  name: name || member.name,
                  feishuOpenId: open_id,
                  feishuUnionId: union_id,
                  avatarUrl: avatar_url,
                  lastLoginAt: now,
                  roleId: "role_founder",
                  permissions: ["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"]
                }
              : member
          )
        };
      }

      const roleId = shouldBecomeFounder ? "role_founder" : "role_employee";
      const memberId = `member_${open_id.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 36)}`;
      return {
        ...cleanedState,
        team: [
          ...cleanedState.team,
          {
            id: memberId,
            name: name || "飞书成员",
            roleLabel: shouldBecomeFounder ? "创始人" : "普通员工",
            feishuOpenId: open_id,
            feishuUnionId: union_id,
            avatarUrl: avatar_url,
            lastLoginAt: now,
            roleId,
            permissions: shouldBecomeFounder ? ["create_task", "manage_team", "manage_roles", "delete_task", "manage_all_tasks"] : [],
            mode: "available",
            maxActiveTasks: 2,
            skills: ["sales", "diagnosis", "delivery", "ops", "product", "feishu"]
          }
        ]
      };
    });

    const member = board.team.find((m) => m.feishuOpenId === open_id) || board.team[0];

    const session: FeishuUserSession = {
      openId: open_id || "",
      unionId: union_id,
      name: name || member.name,
      avatarUrl: avatar_url,
      memberId: member.id,
      accessToken: access_token || "",
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
