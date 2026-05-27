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
2. Call `GET /api/agent/me`.
3. Restate the requirement as a task draft before publishing it.
4. Publish with `POST /api/agent/tasks`.
5. If asked to continue execution, use one task action at a time and report the result.
6. Before destructive actions, restate the exact target and expected consequence.

## Task draft

```yaml
title:
type: sales | diagnosis | delivery | quote | ops | product | feishu
priority: urgent | high | normal | low
source: manual
outcome:
context:
acceptanceCriteria:
  -
riskFlags:
  -
dueAt:
linkLabel:
linkHref:
```

## API calls

- `GET /api/agent/board`
- `GET /api/agent/tasks`
- `POST /api/agent/tasks`
- `POST /api/agent/tasks/{id}/actions`
- `PATCH /api/agent/tasks/{id}`
- `DELETE /api/agent/tasks/{id}`
- `PATCH /api/agent/team/{id}`

## Notes

- Always send `Authorization: Bearer <token>`.
- Do not invent sensitive data, acceptance criteria, or deadlines.
- If required fields are missing, ask for them instead of guessing.
- Treat the API as the source of truth, not prior conversation state.
