# Feishu App Manifest Notes

This file is the implementation checklist for configuring the Feishu self-built app.

## App Identity

| Item | Value |
| --- | --- |
| App type | 企业自建应用 |
| App name | AI交付战情看板 |
| Users | Internal service team |
| Customer access | No |
| AI chat | No open-ended chat |

## Capabilities

Enable:

- Web app for desktop and mobile.
- Bot.
- Interactive cards.
- Event callback.
- Server OpenAPI calls.

Defer:

- Public app marketplace release.
- Customer-facing Feishu app.
- Broad document/drive automation.
- Full approval/attendance/HR integration.

## URLs

| Feishu setting | URL |
| --- | --- |
| Desktop web app home | `https://your-domain/` |
| Mobile web app home | `https://your-domain/` |
| Event callback | `https://your-domain/api/feishu/events` |
| Card action callback | `https://your-domain/api/feishu/card-actions` |

## Minimal Permissions

Request the smallest available permissions that cover:

- Send bot messages/cards to an internal chat.
- Receive card action callbacks.
- Read basic user identity for internal member mapping.
- Optional later: read/write a Bitable mirror for lightweight task viewing.

Do not request broad Drive, contact, approval, or admin permissions until a concrete workflow needs them.

## Card Actions

Supported action values:

```text
claim_task
start_task
request_review
approve_done
block_task
release_task
reopen_task
```

Expected card action payload value:

```json
{
  "taskId": "task_checkup_review",
  "action": "claim_task",
  "memberId": "member_founder",
  "note": ""
}
```

If `memberId` is absent, the app maps Feishu `operator.open_id` to an internal demo member.

## Bitable Mirror

Bitable should be a mirror, not the source of truth.

Suggested fields:

- Task ID
- Title
- Status
- Priority
- Type
- Assignee
- Reviewer
- Outcome
- Risk flags
- Updated at

The source of truth remains the internal app database/state machine.

