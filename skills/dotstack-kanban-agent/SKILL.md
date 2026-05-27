---
name: dotstack-kanban-agent
description: Use this skill when an external AI needs to turn a requirement into a structured task draft and then execute allowed DOTSTACK Kanban web actions through the external agent API.
---

# DOTSTACK Kanban Agent

Use this skill only when the user has provided:
- an API base URL
- a bearer token
- permission to act as that user inside the DOTSTACK Kanban web app

## Required flow

1. Call `GET /api/agent/capabilities`.
2. Call `GET /api/agent/schema`.
3. Call `GET /api/agent/me`.
4. Rewrite the requirement into a task draft that exactly matches the schema fields.
5. Show or restate that draft before publishing it.
6. Publish with `POST /api/agent/tasks`.
7. If asked to continue execution, first read the current task state, then send one action at a time.
8. Before destructive actions, restate the exact target and expected consequence.

## Task draft

```json
{
  "title": "跟进官网新增线索",
  "type": "sales",
  "priority": "high",
  "source": "manual",
  "outcome": "确认线索是否进入深度诊断，并完成首次响应",
  "context": "线索来自官网表单，需要当天回访",
  "acceptanceCriteria": ["完成首次联系", "记录线索结论"],
  "riskFlags": [],
  "dueAt": "2026-05-30T18:00:00+08:00",
  "linkLabel": "线索表单",
  "linkHref": "https://example.com/lead/123"
}
```

## API calls

- `GET /api/agent/schema`
- `GET /api/agent/board`
- `GET /api/agent/tasks`
- `POST /api/agent/tasks`
- `POST /api/agent/tasks/{id}/actions`
- `PATCH /api/agent/tasks/{id}`
- `DELETE /api/agent/tasks/{id}`
- `PATCH /api/agent/team/{id}`

## Notes

- Always send `Authorization: Bearer <token>`.
- Do not send `memberId` or `actorUserId` to `/api/agent/*`.
- Use JSON for requests. The schema endpoint is the source of truth.
- If the user gives snake_case fields like `task_type` or `due_at`, normalize them before requesting.
- Before `POST /api/agent/tasks/{id}/actions`, read the task again or confirm its current status from fresh API data.
- If a request fails, do not guess. Read the error, read `/api/agent/schema` or the current task again, correct the payload, then retry once.
- Do not fabricate `acceptanceCriteria`, `riskFlags`, `dueAt`, or links when the requirement does not provide enough information.
- Do not invent sensitive data, acceptance criteria, or deadlines.
- If required fields are missing, ask for them instead of guessing.
- Treat the API as the source of truth, not prior conversation state.
