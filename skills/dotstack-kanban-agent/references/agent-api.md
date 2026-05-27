# Agent API

Base headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Core routes:

- `GET /api/agent/me`
- `GET /api/agent/capabilities`
- `GET /api/agent/schema`
- `GET /api/agent/board`
- `GET /api/agent/tasks`
- `POST /api/agent/tasks`
- `POST /api/agent/tasks/{id}/actions`
- `PATCH /api/agent/tasks/{id}`
- `DELETE /api/agent/tasks/{id}`
- `PATCH /api/agent/team/{id}`

Task action payload examples:

```json
{ "action": "claim_task" }
```

```json
{ "action": "block_task", "note": "Waiting for customer scope." }
```

```json
{ "targetStatus": "review" }
```

Task draft rules:

- Required: `title`, `type`, `priority`, `outcome`
- Optional: `source`, `context`, `acceptanceCriteria`, `riskFlags`, `dueAt`, `linkLabel`, `linkHref`
- `source` defaults to `manual`
- Do not send `memberId` or `actorUserId` on any `/api/agent/*` route
- Always read `GET /api/agent/schema` before create, update, or action requests
- Normalize alias fields such as `task_type`, `taskType`, `goal`, `background`, `acceptance_criteria`, `risk_flags`, `due_at`, `link_url`, and `target_status`
- Before actions, refresh the task state from API data instead of assuming the previous status is still current
- On failures, correct the payload or state mismatch first; do not loop retries blindly
