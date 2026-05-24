# 运行和发布指南

## 一、本地运行（2 分钟）

```bash
cd 15_feishu_startup_kanban
npm install
npm run dev -- --port 3015
```

浏览器打开 http://localhost:3015 即可看到看板。

本地运行时不需要任何飞书配置，所有功能都可以用（飞书推送会返回预览 JSON 而不是真的发消息）。

---

## 二、部署到服务器

看板是标准 Next.js 应用，部署方式和普通 Next.js 一样。

### 方案 A：Vercel（最快，免费额度够用）

1. 把代码推到 GitHub
2. 登录 [vercel.com](https://vercel.com)，导入仓库
3. Root Directory 设为 `15_feishu_startup_kanban`
4. 在 Vercel 的 Environment Variables 里填入飞书凭证（见下方）
5. 部署完成后拿到 `https://xxx.vercel.app` 域名

### 方案 B：自有服务器

```bash
npm run build
npm start -- --port 3015
```

用 Nginx 反代到 3015 端口，配好 HTTPS 证书。

### 方案 C：Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3015
CMD ["npm", "start", "--", "--port", "3015"]
```

---

## 三、配置环境变量

复制 `.env.example` 为 `.env.local`（本地）或在部署平台设置：

```bash
# 飞书开放平台 → 你的应用 → 凭证与基础信息
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 飞书开放平台 → 事件与回调 → Encrypt Key / Verification Token
FEISHU_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=                          # 可选，暂时留空

# 你的内部团队群的 chat_id（机器人发消息用）
FEISHU_DEFAULT_CHAT_ID=oc_xxxxxxxxxxxxxxxx

# 部署后的公网地址
NEXT_PUBLIC_APP_BASE_URL=https://your-domain.com

# 前端飞书免登用（和 FEISHU_APP_ID 相同）
NEXT_PUBLIC_FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
```

---

## 四、发布到飞书（完整步骤）

### 第 1 步：创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)
2. 点击「创建企业自建应用」
3. 应用名称：`AI交付战情看板`
4. 应用描述：`三人团队内部任务认领和交付复核看板`

### 第 2 步：开启能力

在应用的「添加应用能力」页面，开启：

- ✅ **网页应用**（Web App）
- ✅ **机器人**（Bot）

### 第 3 步：配置网页应用

进入「网页应用」设置：

| 配置项 | 填写 |
|--------|------|
| 桌面端主页 | `https://your-domain.com` |
| 移动端主页 | `https://your-domain.com` |

> 这就是用户在飞书工作台里点击应用后打开的页面。

### 第 4 步：配置事件回调

进入「事件与回调」：

| 配置项 | 填写 |
|--------|------|
| 请求地址 | `https://your-domain.com/api/feishu/events` |
| Encrypt Key | 可选，留空即可 |
| Verification Token | 复制到 `.env` 的 `FEISHU_VERIFICATION_TOKEN` |

点击验证，飞书会发一个 challenge 请求，我们的接口会自动响应。

### 第 5 步：配置卡片回调

进入「消息卡片」→「卡片回调地址」：

```
https://your-domain.com/api/feishu/card-actions
```

### 第 6 步：申请权限

在「权限管理」中申请以下权限：

| 权限 | 用途 |
|------|------|
| `im:message:send_as_bot` | 机器人发消息/卡片 |
| `contact:user.base:readonly` | 读取用户基本信息（免登） |

### 第 7 步：配置免登

进入「安全设置」→「重定向 URL」，添加：

```
https://your-domain.com
```

### 第 8 步：发布应用

1. 进入「版本管理与发布」
2. 创建版本
3. 可用范围选择：你们三个人（或整个组织）
4. 提交审核（企业内部应用通常秒过）

### 第 9 步：验证

1. 在飞书手机端 → 工作台 → 找到「AI交付战情看板」→ 点击打开
2. 应该自动完成飞书免登，顶部显示你的名字
3. 拖拽一个任务试试

---

## 五、配置到期提醒（定时推送）

到期提醒需要定时调用 `POST /api/feishu/reminders`。

### 方案 A：飞书定时任务（推荐）

飞书开放平台暂不直接支持 cron，但你可以：

1. 在飞书多维表格里建一个自动化流程，每小时触发一次 Webhook
2. Webhook 地址填：`https://your-domain.com/api/feishu/reminders`
3. 方法：POST，Body 为空即可

### 方案 B：外部 Cron

如果用 Vercel，可以用 [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)：

在 `vercel.json` 中添加：

```json
{
  "crons": [
    {
      "path": "/api/feishu/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

这样每小时检查一次即将到期的任务并推送飞书消息。

### 方案 C：服务器 crontab

```bash
0 * * * * curl -X POST https://your-domain.com/api/feishu/reminders
```

---

## 六、每日摘要推送

每天早上推送看板摘要到团队群：

```bash
# 手动触发
curl -X POST https://your-domain.com/api/feishu/push-digest

# 或加到 cron（每天早上 9 点）
0 9 * * * curl -X POST https://your-domain.com/api/feishu/push-digest
```

---

## 七、获取 chat_id

机器人需要知道往哪个群发消息：

1. 把机器人加入你们的内部群
2. 在群设置 → 群信息 → 复制群链接
3. 群链接格式：`https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=xxx`
4. 或者通过 API 获取：调用 `GET /open-apis/im/v1/chats` 找到对应群的 `chat_id`
5. 填入 `FEISHU_DEFAULT_CHAT_ID`

---

## 八、团队成员绑定

目前 demo 数据里三个成员的 `feishuOpenId` 是占位值。正式使用时需要替换为真实的飞书 Open ID：

1. 在飞书开放平台 → 通讯录 → 搜索成员 → 复制 Open ID
2. 或者让每个人在飞书中打开看板，登录失败时接口会返回他的 `openId`
3. 把真实 Open ID 填入 `src/domain/seed.ts` 中对应成员的 `feishuOpenId` 字段

```typescript
// 例如
{
  id: "member_founder",
  name: "张三",
  feishuOpenId: "ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // 真实值
  ...
}
```

---

## 九、常见问题

**Q: 本地开发时飞书登录不生效？**
A: 正常。飞书免登只在飞书客户端内嵌网页中生效。本地开发用「我的」页面手动切换身份。

**Q: 卡片按钮点了没反应？**
A: 检查卡片回调地址是否配置正确，以及应用是否已发布。

**Q: 提醒没有收到？**
A: 确认 cron 在运行、`FEISHU_DEFAULT_CHAT_ID` 已配置、机器人已加入群。

**Q: 数据重启后丢失？**
A: 当前是内存存储（demo 用途）。生产环境需要接数据库，把 `src/lib/store.ts` 改为读写数据库即可，接口不变。

---

## 十、技术检查命令

```bash
npm run typecheck   # TypeScript 类型检查
npm run build       # 生产构建
npm test            # 运行测试
```
