import { NextResponse } from "next/server";
import { getFeishuConfig, isFeishuConfigured, getTenantAccessToken } from "@/lib/feishu/client";
import { getKanbanStore } from "@/lib/store";
import type { FeishuUserSession } from "@/domain/models";

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

    // 匹配 team member
    const board = await getKanbanStore().read();
    const member = board.team.find((m) => m.feishuOpenId === open_id);

    if (!member) {
      return NextResponse.json({
        error: "你的飞书账号未关联到团队成员，请联系管理员配置 feishuOpenId",
        openId: open_id,
        name,
        fallback: true
      }, { status: 403 });
    }

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

    return NextResponse.json({ session, member });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "登录失败",
      fallback: true
    }, { status: 500 });
  }
}
