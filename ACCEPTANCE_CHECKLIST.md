# Acceptance Checklist

## Product

- [x] Board supports task creation.
- [x] Board supports self-claiming by available members.
- [x] Board supports claimed -> doing -> review -> done.
- [x] Board supports blocked and release states.
- [x] Board uses a lightweight startup workflow, not a heavy project-management process.
- [x] Board includes three seeded team members.
- [x] Board makes WIP limits visible and enforced in domain logic.
- [x] Board distinguishes external/high-risk work from internal-only work.
- [x] Board supports pointer/touch drag interaction across lanes.
- [x] Board provides lane tabs and horizontally focused lanes on narrow screens.
- [x] Board shows a bottom drop tray during mobile/tablet drag.
- [x] Drag/drop movement is validated by the server state machine.

## UI Quality

- [x] `ui-ux-pro-max` design system was generated and persisted.
- [x] Frontend uses a polished mobile-first cockpit instead of a click-heavy admin shell.
- [x] Cards use stable dimensions, visible priority/type/review states, and a floating drag preview.
- [x] UI avoids generic AI gradient styling and oversized marketing composition.
- [x] Focus states and reduced-motion preferences are handled in CSS.
- [x] No emoji icons are used in the new frontend.

## Feishu Integration

- [x] App is designed as Feishu embedded web app.
- [x] Bot digest card payload generation exists.
- [x] Task card payload generation exists.
- [x] Feishu card action callback route exists.
- [x] Feishu event challenge route exists.
- [x] Feishu message OpenAPI adapter exists.
- [x] Missing credentials produce preview payloads rather than crashing.
- [ ] Real Feishu app credentials have been configured.
- [ ] Real Feishu tenant callback validation has been tested.
- [ ] Final mobile rendering has been reviewed inside the real Feishu mobile container.

## Engineering

- [x] README exists.
- [x] Setup instructions exist.
- [x] Environment variable example exists.
- [x] Type-safe domain models exist.
- [x] Server-side validation exists.
- [x] Seed/demo data exists.
- [x] Tests exist.
- [x] Drag/drop workflow tests exist.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Security and data-boundary notes exist.

## Manual Review

- [ ] Confirm final Feishu permission list in the real developer console.
- [ ] Confirm whether Bitable mirror should be read-only or editable.
- [ ] Confirm deployment domain and callback URL.
- [ ] Confirm actual three team member Feishu `open_id` values.
