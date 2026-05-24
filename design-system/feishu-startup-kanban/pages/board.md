# Board Page Overrides

> **PROJECT:** Feishu Startup Kanban
> **Generated:** 2026-05-21 14:50:05
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero headline, 2. Short description, 3. Benefit bullets (3 max), 4. CTA, 5. Footer

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Minimalist: Brand + white #FFFFFF + accent. Buttons: High contrast 7:1+. Text: Black/Dark grey

### Component Overrides

- Avoid: Desktop-first causing mobile issues
- Avoid: Large blocking CSS files
- Avoid: Default keyboard for all inputs

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Deal movement animations, metric updates, leaderboard ranking changes, gauge needle movements, status change highlights
- Responsive: Start with mobile styles then add breakpoints
- Performance: Inline critical CSS defer non-critical
- Forms: Use inputmode attribute
- CTA Placement: Center, large CTA button
