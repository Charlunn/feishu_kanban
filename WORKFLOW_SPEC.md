# Workflow Spec

## Board Philosophy

The board is designed for a three-person early-stage team:

- Everyone can propose work.
- Everyone can pick up work.
- There is no heavy role hierarchy.
- External-facing work still needs review.
- Small tasks are preferred over vague projects.
- The primary interaction is dragging cards between lanes, not clicking status buttons.

## Lanes

| Lane | Meaning | Exit Rule |
| --- | --- | --- |
| 任务池 | Idea exists, but scope may be incomplete | Add outcome and acceptance criteria |
| 可领取 | Ready for any available member | Someone claims it |
| 已认领 | A member has taken responsibility | Assignee starts it |
| 进行中 | Work is actively happening | Assignee requests review or blocks it |
| 阻塞 | Missing decision, material, credential, or external input | Release or reclaim after blocker clears |
| 待复核 | Work is ready for another person to inspect | Reviewer approves or reopens |
| 已完成 | Acceptance criteria met and logged | No further movement unless reopened |

## Drag Rules

Dragging a card is not only a front-end gesture. It calls the server workflow rules:

- Drop on `可领取`: release the task back to the team.
- Drop on `已认领`: claim the task as the current operator.
- Drop on `进行中`: claim and start if needed.
- Drop on `阻塞`: mark the task blocked.
- Drop on `待复核`: claim/start if needed, then request review.
- Drop on `已完成`: allowed only from review with a valid reviewer.

Invalid drops are rejected by the API and shown in the UI.

## Mobile Interaction

- The board uses horizontally scrollable lanes on narrow screens.
- Lane tabs let the user jump to a target lane quickly.
- During an active drag, a fixed bottom drop tray appears with target statuses.
- The floating drag card uses `pointer-events: none`, so the tray and lanes remain detectable by `document.elementsFromPoint`.
- Desktop keeps all seven lanes visible where viewport width allows it.

## Minimum Task Shape

Every task needs:

- Title.
- Outcome.
- Type.
- Priority.
- 1-6 acceptance criteria.
- Risk flags when relevant.

Optional:

- Feishu doc/Bitable/internal link.
- Context.
- Blocked reason.

## Team Rules

- Each member has a WIP limit of 2 active tasks by default.
- `away` members cannot claim tasks.
- A task can be released back to the board when the owner cannot continue.
- High-risk work requires a reviewer who is not the assignee.
- Completion requires acceptance criteria.

## High-Risk Work

Independent review is required for tasks flagged with:

- `customer_facing`
- `sensitive_data`
- `quote_scope`
- `ai_output`

Examples:

- Diagnosis report conclusions.
- ROI or quote wording.
- Customer-facing delivery files.
- AI-generated drafts.
- Anything involving potentially sensitive customer material.

## What This Is Not

- Not a generic AI chat bot.
- Not a full Jira replacement.
- Not a personal productivity tracker.
- Not an employee performance tool.
- Not a customer portal.
