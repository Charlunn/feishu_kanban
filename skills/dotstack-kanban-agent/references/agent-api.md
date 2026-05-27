# Agent API

Base headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Core routes:

- `GET /api/agent/me`
- `GET /api/agent/capabilities`
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
