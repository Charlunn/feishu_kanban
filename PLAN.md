# Feishu Startup Kanban Plan

## Goal

Build a Feishu-native internal task board for a three-person early-stage team. The board should support lightweight task dispatch, self-claiming, visible workflow movement, human review, completion records, and Feishu card/event integration.

## Product Shape

The application is an enterprise self-built Feishu app with:

- Embedded web app as the main workbench.
- Drag-first kanban interaction for daily task movement.
- Mobile-first UI suitable for the Feishu mobile container.
- Bot digest cards for new work and daily focus.
- Interactive card actions for claiming and moving tasks.
- Event and card-action route handlers.
- Feishu OpenAPI adapter for sending cards.
- Local domain rules and audit logs as the source of truth.

## Frontend Plan

- Use the persisted `ui-ux-pro-max` design system under `design-system/feishu-startup-kanban`.
- Replace the old click-heavy shell with a polished command deck and live board.
- Keep the product visually aligned with enterprise workflow software: quiet, dense, readable, high contrast, no AI-gradient decoration.
- Make cards draggable with pointer events so mouse, touchpad, and touch screens share the same model.
- Add a bottom drop tray for narrow screens so mobile users can drag to target states without fighting horizontal scroll.
- Preserve loading, error, empty, focus, reduced-motion, and disabled states where practical.

## Workflow

```text
任务池 -> 可领取 -> 已认领 -> 进行中 -> 阻塞 / 待复核 -> 已完成
```

Rules:

- Any team member can claim a ready task if their active WIP is below their personal limit.
- High-risk or external-facing work requires review by someone other than the assignee.
- Blocked work must record a reason and can be released back to the pool.
- Completion requires acceptance criteria.
- Feishu actions update the internal board first, then cards can be refreshed or sent.

## Deliverables

- Runnable Next.js app.
- Domain model and workflow operations.
- Drag-first responsive frontend.
- Feishu card/event/OpenAPI integration layer.
- Demo data for a three-person team.
- Tests for claim, transition, review, drag/drop, and Feishu card behavior.
- README, setup guide, Feishu manifest notes, security boundary, acceptance checklist, and completion report.
