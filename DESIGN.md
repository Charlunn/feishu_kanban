# DOTSTACK 点绽 DESIGN.md

> **Version**: 1.0  
> **Brand**: DOTSTACK / 点绽  
> **Purpose**: This file is the single Markdown design system source for AI coding agents, product designers, frontend engineers, marketing designers, and documentation authors. Use it to generate consistent DOTSTACK interfaces, pages, dashboards, decks, social assets, office templates, and brand extensions.  
> **Core proposition**: 点亮连接，堆叠增长 / Connect Dots, Stack Growth  
> **Brand category**: Technology company; enterprise data connection and intelligent growth solutions.

---

## 0. How AI agents must use this file

### 0.1 Priority of this file

When building any DOTSTACK digital or brand artifact, treat this file as the design source of truth unless a newer official brand asset package overrides it.

Use this file to decide:

- Visual atmosphere and product personality
- Color palette and semantic roles
- Typography hierarchy
- Spacing, grid, layout rhythm, and density
- Component styling and interaction states
- Logo placement, clear space, and misuse rules
- Icon, illustration, supergraphic, and motion language
- Marketing page, dashboard, document, deck, and social media composition

### 0.2 Agent rules

AI agents must follow these rules:

1. **Never invent a new DOTSTACK logo.** Use official logo assets when available. If no vector asset is available, represent the logo using an image asset placeholder and do not redraw it as production logo code.
2. **Use DOTSTACK Blue as the dominant identity color.** Orange is a focus and energy accent, not a large-area background color except in controlled CTA or data-highlight contexts.
3. **Keep the design clean, systematic, and data-oriented.** Favor white space, grid alignment, crisp cards, modular components, and clear information hierarchy.
4. **Avoid decorative overload.** Brand graphics should support information, not compete with it.
5. **Use Chinese-first bilingual hierarchy when content is Chinese.** Chinese headings may be primary with English subtitles. For global product UI, English may be primary with Chinese optional.
6. **Use the color, spacing, typography, and component tokens defined below before creating one-off styling.**
7. **When generating React/Tailwind UI**, map the tokens in this file into Tailwind classes or CSS variables. Avoid arbitrary colors unless defined here.
8. **When uncertain**, prefer: white/light background, navy text, one orange focal element, soft blue accents, 8pt spacing, rounded cards, subtle borders, minimal shadows.

### 0.3 Recommended file placement

Place this file at the project root:

```txt
/DESIGN.md
/src
/public
/package.json
```

Recommended asset folder:

```txt
/public/brand/
  dotstack-logo-horizontal.svg
  dotstack-logo-symbol.svg
  dotstack-logo-vertical.svg
  dotstack-logo-white.svg
  dotstack-logo-blue.svg
  dotstack-symbol-white.svg
  dotstack-pattern-grid.svg
  dotstack-supergraphic-ring.svg
```

---

## 1. Brand overview

### 1.1 Brand name

| Item | Value |
|---|---|
| Chinese name | 点绽 |
| English name | DOTSTACK / dotstack |
| Preferred wordmark | `dotstack` lowercase for logo; `DOTSTACK` uppercase for formal section titles |
| Brand shorthand | DOTSTACK 点绽 |
| Product/business category | Enterprise data connection and intelligent growth solutions |
| Brand sentence | 连接数据、系统与业务，驱动企业智能增长。 |

### 1.2 Brand positioning

**企业数据连接与智能增长解决方案品牌**  
DOTSTACK helps enterprises connect data, systems, content, and users, then transform those connections into measurable growth through intelligent workflows, analytics, and automation.

### 1.3 Brand proposition

**点亮连接，堆叠增长**  
**Connect Dots, Stack Growth**

Meaning:

- “点亮” expresses activation, insight, discovery, and intelligent ignition.
- “连接” expresses data connectivity, system integration, and cross-functional collaboration.
- “堆叠” expresses accumulated value, modular architecture, and continuous compounding.
- “增长” expresses business outcomes, operational efficiency, and scalable momentum.

### 1.4 Brand mission

**让数据、系统与业务高效连接，驱动持续增长。**

Design implication:

- Show clear data relationships.
- Use connected dots, arcs, paths, and modular cards.
- Make growth visible through charts, progressive steps, motion, and outcome metrics.

### 1.5 Brand vision

**成为企业智能连接与增长引擎。**

Design implication:

- Communicate reliability and intelligence.
- Use structured interfaces, calm technical visuals, and precise hierarchy.
- Avoid playful randomness or consumer-app casualness.

### 1.6 Brand values

| Value | Chinese | UI implication |
|---|---|---|
| Clarity | 清晰 | High contrast, readable typography, clear modules, minimal noise |
| Connection | 连接 | Nodes, paths, linked cards, relationship diagrams |
| Growth | 增长 | Upward charts, progress systems, measurable metrics |
| Intelligence | 智能 | Focus frames, automation states, insight cards, AI badges |
| Trust | 可靠 | Stable blue base, consistent spacing, restrained motion, accessible contrast |

### 1.7 Brand personality

DOTSTACK should feel:

- **理性 / Rational**: precise, calm, structured
- **敏捷 / Agile**: responsive, modular, efficient
- **开放 / Open**: connected, ecosystem-friendly, API-oriented
- **可信 / Trustworthy**: enterprise-grade, secure, stable
- **前瞻 / Forward-looking**: intelligent, data-driven, future-ready

Avoid feeling:

- Cartoonish
- Overly playful
- Crypto/neon speculative
- Heavy industrial
- Luxury-fashion decorative
- Generic SaaS blue without the orange energy point

---

## 2. Visual concept

### 2.1 Logo concept decomposition

The DOTSTACK logo visual language is built from four symbolic elements:

| Logo element | Meaning | Usage extension |
|---|---|---|
| Orange central dot | 起点 / 灵感 / 能量核心 | Use as focal point, active state, notification, insight marker |
| Blue arc | 连接 / 生态 / 环路 | Use as orbit, flow path, circular progress, ecosystem diagram |
| Radiant blue strokes | 扩散 / 增长 / 堆叠 | Use as growth burst, activation, loading, stacked data layers |
| Overall circular rhythm | 协同 / 系统化 / 循环 | Use as background supergraphic, process loop, platform architecture visual |

### 2.2 Core visual metaphor

**A data point becomes a connected system, then radiates into compounding growth.**

This metaphor should guide product UI, marketing visuals, and brand motion:

```txt
Dot → Connection → Stack → Intelligence → Growth
数据点 → 连接 → 堆叠 → 智能 → 增长
```

### 2.3 Visual keywords

Use these keywords when prompting AI or briefing designers:

- Clean enterprise technology
- Data connection
- Intelligent growth
- Modular systems
- White space
- Blueprint grid
- Blue-orange focus
- Rounded precision
- Soft depth
- Insight activation
- Connected ecosystem
- Scalable dashboard

---

## 3. Logo system

### 3.1 Primary logo lockups

| Lockup | Use case |
|---|---|
| Horizontal logo: symbol + `dotstack` | Default and preferred use in headers, websites, decks, documents |
| Symbol-only logo | App icon, favicon, social avatar, small badges, watermark, pattern source |
| Vertical logo | Backup use when horizontal space is constrained |
| Chinese-English lockup: `DOTSTACK 点绽` | Formal title pages, manual covers, corporate communication |

### 3.2 Logo construction guidance

Use `x` as the base construction unit.

Recommended proportions based on the VI system:

- Symbol width: `6x`
- Symbol height: `6x`
- Wordmark height: `6x`
- Gap between symbol and wordmark: `2x`
- Total horizontal lockup width: approximately `26x`
- Orange core circle diameter: `2x`
- Outer arc radius: approximately `3x`
- Inner arc radius: approximately `2.5x`
- Dot diameter: approximately `0.8x`
- Radiant stroke width: approximately `0.8x`
- Radiant stroke length: approximately `2.2x`

These values are for specification and layout reasoning. Do not rebuild the official production logo from these values unless asked to create a draft placeholder.

### 3.3 Clear space

Minimum clear space around the logo:

- Use `1x` clear space on all sides.
- `x` equals the orange dot diameter in the symbol.
- No text, icon, border, photo edge, card edge, or competing graphic may enter the clear-space zone.

For small UI headers, ensure the logo has at least:

- `16px` left/right breathing room inside navigation bars
- `12px` vertical breathing room in compact app bars
- `24px` surrounding space on marketing pages

### 3.4 Minimum size

| Usage | Minimum size |
|---|---:|
| Horizontal logo, print | `25mm` width |
| Horizontal logo, digital | `120px` width |
| Symbol-only logo, print | `10mm` width |
| Symbol-only logo, digital | `48px` width |
| Favicon / app small icon | Use simplified symbol, test at `16px`, `24px`, `32px` |

### 3.5 Logo color variants

| Variant | Use case |
|---|---|
| Full-color logo | Default on white or very light backgrounds |
| Reversed white logo | Dark navy backgrounds |
| Single DOTSTACK Blue logo | Restricted single-color print or low-color UI |
| Single white logo | Dark single-color usage |
| Symbol-only full color | Avatar, favicon, icon badge, watermark |

### 3.6 Correct background usage

Use the logo on:

- White background
- Mist Gray background
- Deep Navy background with reversed logo
- Calm photography with sufficient contrast and a soft overlay
- Simple gradient backgrounds where contrast is preserved

### 3.7 Logo misuse

Never:

- Stretch or compress the logo
- Rotate or skew the logo
- Change blue/orange colors arbitrarily
- Add drop shadow, bevel, outline, glow, or stroke to the logo
- Separate the symbol and wordmark in a non-standard lockup
- Put the logo on complex or low-contrast imagery
- Use rainbow, neon, green, red, purple, or unrelated brand colors for the logo
- Put the logo inside a heavy container unless required by layout
- Crop the symbol
- Recreate the wordmark in a different typeface

---

## 4. Color system

### 4.1 Brand color roles

DOTSTACK uses a high-trust enterprise blue foundation with an orange energy point. The color system should express intelligence, connection, clarity, and growth.

Recommended use ratio:

| Color group | Ratio | Role |
|---|---:|---|
| DOTSTACK Blue | 60% | Main brand identity, headers, navigation, primary UI |
| White / Gray | 25% | Backgrounds, surfaces, content readability |
| DOTSTACK Orange | 10% | Focus, CTA emphasis, active states, data highlights |
| Supporting colors | 5% | Charts, states, secondary UI detail |

### 4.2 Primary colors

| Token | Name | HEX | RGB | CMYK | Usage |
|---|---|---:|---:|---:|---|
| `--ds-blue` | DOTSTACK Blue / 点绽蓝 | `#0A2E84` | `10, 46, 132` | `92, 65, 0, 48` | Primary brand color, headings, nav, key lines |
| `--ds-orange` | DOTSTACK Orange / 点绽橙 | `#FF6A00` | `255, 106, 0` | `0, 58, 100, 0` | Focal point, CTA, active state, key metrics |

### 4.3 Supporting colors

| Token | Name | HEX | RGB | Usage |
|---|---|---:|---:|---|
| `--ds-tech-blue` | Tech Blue | `#5A84FF` | `90, 132, 255` | Secondary highlight, charts, links, UI accents |
| `--ds-deep-navy` | Deep Navy | `#051B4A` | `5, 27, 74` | Dark surfaces, footer, hero depth |
| `--ds-mist-gray` | Mist Gray | `#EEF2F8` | `238, 242, 248` | Page background, card background, section separation |
| `--ds-neutral-gray` | Neutral Gray | `#6B7280` | `107, 114, 128` | Secondary text, meta labels, disabled text |

### 4.4 Extended neutral scale

Use this neutral scale for UI implementation:

| Token | HEX | Usage |
|---|---:|---|
| `--ds-white` | `#FFFFFF` | Main canvas, cards |
| `--ds-bg` | `#F7FAFF` | Page background |
| `--ds-surface` | `#FFFFFF` | Cards, modals, popovers |
| `--ds-surface-soft` | `#F3F6FC` | Section background, table header |
| `--ds-border` | `#D9E2F2` | Default border |
| `--ds-border-strong` | `#B8C6E0` | Strong divider, table border |
| `--ds-text-primary` | `#051B4A` | Main text |
| `--ds-text-secondary` | `#334B7A` | Secondary text |
| `--ds-text-muted` | `#6B7280` | Helper text |
| `--ds-text-inverse` | `#FFFFFF` | Text on dark surfaces |

### 4.5 Semantic colors

DOTSTACK should not overuse unrelated semantic colors. Keep semantic colors slightly restrained.

| Token | HEX | Usage |
|---|---:|---|
| `--ds-success` | `#16A34A` | Success alerts, completed status |
| `--ds-info` | `#2563EB` | Information, neutral system messages |
| `--ds-warning` | `#F59E0B` | Warning, attention |
| `--ds-danger` | `#DC2626` | Error, destructive action |
| `--ds-ai` | `#5A84FF` | AI insight, automation, intelligence modules |

### 4.6 Gradients

Use gradients sparingly and systematically.

#### Blue gradient

```css
background: linear-gradient(135deg, #0A2E84 0%, #5A84FF 100%);
```

Use for:

- Hero abstract graphics
- Active data cards
- Premium dashboard panels
- Section dividers

Do not use as default page background.

#### Orange gradient

```css
background: linear-gradient(135deg, #FF6A00 0%, #FFB266 100%);
```

Use for:

- CTA emphasis
- Growth highlight
- Active step marker
- Small visualization accent

Do not use for long text areas.

#### Deep navy surface gradient

```css
background: radial-gradient(circle at 70% 30%, rgba(90,132,255,0.25), transparent 35%),
            linear-gradient(135deg, #051B4A 0%, #0A2E84 100%);
```

Use for:

- Hero dark cards
- Footer
- Event panels
- Product feature highlight cards

### 4.7 Color accessibility

- Body text on white should use `#051B4A` or `#0A2E84`.
- Avoid light blue text on white for paragraphs.
- Orange text on white should be used only for large headings or short labels; do not use orange for small body text.
- Do not rely on orange alone to communicate error, warning, or active state. Pair with icon, label, or shape.
- For dark backgrounds, use white text with restrained orange or tech-blue accent.

### 4.8 Color don’ts

Never use:

- Neon green, magenta, rainbow gradients, or saturated unrelated palettes
- Low-contrast gray text on mist backgrounds
- Large orange full-screen backgrounds unless an event campaign explicitly requires it
- Blue and orange in equal visual weight across large areas
- Random chart palettes that break the brand system
- Pure black for main surfaces unless in a special presentation context; use Deep Navy instead

---

## 5. Typography system

### 5.1 Font families

| Role | Font |
|---|---|
| Chinese standard font | 思源黑体 / Source Han Sans SC |
| English standard font | Inter |
| Number and code font | IBM Plex Mono |
| Fallback Chinese | Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif |
| Fallback English | Inter, Arial, Helvetica, sans-serif |
| Fallback mono | IBM Plex Mono, SFMono-Regular, Consolas, monospace |

### 5.2 Typography tone

Typography should feel:

- Clear
- Rational
- Technical
- Enterprise-grade
- Efficient
- Slightly geometric but not cold

Avoid:

- Decorative display fonts
- Handwritten fonts
- Serif fonts for core UI
- Overly condensed fonts
- Excessive font mixing

### 5.3 Type scale

| Level | Usage | Font | Size | Line height | Weight | Tracking |
|---|---|---|---:|---:|---|---:|
| Display | Hero title | Source Han Sans SC / Inter | `56px` | `68px` | 700 | `-1%` |
| H1 | Page title | Source Han Sans SC / Inter | `40px` | `52px` | 700 | `-0.5%` |
| H2 | Section title | Source Han Sans SC / Inter | `28px` | `36px` | 700 | `0` |
| H3 | Module title | Source Han Sans SC / Inter | `20px` | `28px` | 600 | `0` |
| H4 | Card title | Source Han Sans SC / Inter | `16px` | `24px` | 600 | `0` |
| Body large | Marketing body | Source Han Sans SC / Inter | `16px` | `28px` | 400 | `0` |
| Body | Product UI body | Source Han Sans SC / Inter | `14px` | `22px` | 400 | `0` |
| Body small | Helper copy | Source Han Sans SC / Inter | `12px` | `18px` | 400 | `0` |
| Caption | Figure/table label | Source Han Sans SC / Inter | `11px` | `16px` | 400 | `0` |
| Micro | Badges, footnotes | Source Han Sans SC / Inter | `10px` | `14px` | 500 | `0.5%` |
| Code | Code/data | IBM Plex Mono | `13px` | `20px` | 400 | `0` |

### 5.4 Print manual type scale

When recreating the VI manual pages or PDF layouts:

| Level | Size | Line height | Weight |
|---|---:|---:|---|
| H1 | `40pt` | `52pt` | Bold |
| H2 | `28pt` | `36pt` | Bold |
| H3 | `20pt` | `28pt` | Medium |
| Body | `11pt` | `18pt` | Regular |
| Caption | `9pt` | `14pt` | Regular |

### 5.5 Bilingual rules

- Chinese and English may appear together as: `中文标题 / English Subtitle`.
- Use Chinese first for China-market material.
- Use English first for global product UI.
- Keep English subtitles smaller, lighter, and slightly muted.
- Use slash separators with spaces: `品牌概述 / Brand Overview`.
- Keep key bilingual labels consistent:
  - 数据 / Data
  - 连接 / Connect
  - 增长 / Growth
  - 智能 / Intelligence
  - 可靠 / Trust

### 5.6 Numeric styling

Numbers should feel precise and data-driven.

Use:

- Inter for metrics in UI
- IBM Plex Mono for code, logs, API data, and tabular technical values
- Large numeric cards for key metrics
- Orange only for the single most important positive highlight
- Blue for stable primary metrics

Metric example:

```txt
98.6%  系统稳定性
120+   合作企业
24/7   全球服务支持
```

### 5.7 Typography don’ts

Never:

- Use more than two font families plus mono
- Use tiny body text below `12px` in product UI
- Use orange for long body copy
- Center-align dense information tables
- Over-tighten Chinese character spacing
- Use all-caps English for long body text
- Mix unrelated font personalities

---

## 6. Layout and spacing

### 6.1 Grid philosophy

DOTSTACK layouts are systematic and modular. They should feel like a connected data platform rather than a loose marketing collage.

Core principles:

- Use left alignment by default.
- Use 8pt grid for digital UI.
- Use generous white space.
- Prefer modular cards and sections.
- Use subtle dividers, not heavy frames.
- Let orange mark focus, not fill space.
- Balance dense data with calm margins.

### 6.2 8pt spacing system

| Token | Value | Usage |
|---|---:|---|
| `space-0` | `0` | Reset |
| `space-1` | `4px` | Tiny gaps, icon/text offset |
| `space-2` | `8px` | Compact gap |
| `space-3` | `12px` | Small padding |
| `space-4` | `16px` | Default component padding |
| `space-5` | `20px` | Form and card inner gap |
| `space-6` | `24px` | Card padding, section gap |
| `space-8` | `32px` | Section inner gap |
| `space-10` | `40px` | Large card/hero rhythm |
| `space-12` | `48px` | Section padding |
| `space-16` | `64px` | Hero spacing |
| `space-20` | `80px` | Major landing section |
| `space-24` | `96px` | Large page breathing room |

### 6.3 Page layout widths

| Layout | Max width |
|---|---:|
| Marketing page content | `1200px` |
| Wide product dashboard | `1440px` |
| Documentation content | `920px` |
| Form page | `720px` |
| Modal | `480px`, `640px`, or `800px` |
| Email signature | `600–700px` |
| Presentation 16:9 | `1920×1080px` or `1280×720px` |

### 6.4 Column systems

Use:

- 12-column grid for desktop marketing pages
- 8-column grid for tablet
- 4-column grid for mobile
- 24px gutter on desktop
- 16px gutter on tablet/mobile

Recommended responsive container:

```css
.container {
  width: min(100% - 48px, 1200px);
  margin-inline: auto;
}

@media (max-width: 768px) {
  .container {
    width: min(100% - 32px, 100%);
  }
}
```

### 6.5 Section rhythm

Marketing pages:

- Hero top padding: `88–120px`
- Hero bottom padding: `80–96px`
- Section padding: `72–96px`
- Compact section padding: `48–64px`
- Card grid gap: `24px`
- Large title to body gap: `16–24px`
- Body to CTA gap: `32px`

Product dashboards:

- App shell padding: `24px`
- Card padding: `20–24px`
- Dense table cell padding: `12px 16px`
- Dashboard grid gap: `16–24px`
- Sidebar width: `240–280px`

### 6.6 White space rules

- Primary hero content must have enough empty space to feel premium.
- Dashboards may be dense but should keep clear card separation.
- Do not fill every empty area with dots or arcs.
- In printed office applications, keep core information areas with at least `12mm` clear margin.
- QR code and contact blocks must retain at least `12mm` white space in print.

---

## 7. Shape, radius, border, and elevation

### 7.1 Radius scale

DOTSTACK uses rounded geometry inspired by dots, arcs, and modular systems.

| Token | Value | Usage |
|---|---:|---|
| `radius-xs` | `4px` | Tiny labels, chart markers |
| `radius-sm` | `8px` | Inputs, compact buttons |
| `radius-md` | `12px` | Default cards and controls |
| `radius-lg` | `16px` | Feature cards |
| `radius-xl` | `24px` | Hero cards, large modules |
| `radius-full` | `999px` | Pills, toggles, avatars |

Recommended default:

- Buttons: `10–12px`
- Inputs: `10–12px`
- Cards: `16px`
- Large hero panels: `24px`
- Badges: full pill

### 7.2 Border system

| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `1px solid #D9E2F2` | Cards, forms |
| `border-strong` | `1px solid #B8C6E0` | Data tables, selected panels |
| `border-brand` | `1px solid rgba(10,46,132,0.18)` | Brand panels |
| `border-focus` | `2px solid #5A84FF` | Keyboard focus and active input |

### 7.3 Elevation

Keep depth subtle and enterprise-grade.

| Level | Shadow |
|---|---|
| `shadow-0` | none |
| `shadow-1` | `0 1px 2px rgba(5, 27, 74, 0.06)` |
| `shadow-2` | `0 8px 24px rgba(5, 27, 74, 0.08)` |
| `shadow-3` | `0 16px 48px rgba(5, 27, 74, 0.12)` |
| `shadow-glow-blue` | `0 0 0 6px rgba(90, 132, 255, 0.12)` |
| `shadow-glow-orange` | `0 0 0 6px rgba(255, 106, 0, 0.12)` |

Use strong shadows only for:

- Modals
- Floating command panels
- Hero feature cards
- Product screenshot composites

Avoid heavy black shadows.

---

## 8. Component system

### 8.1 Buttons

#### Primary button

Use for main action.

```css
.ds-button-primary {
  background: #0A2E84;
  color: #FFFFFF;
  border-radius: 12px;
  padding: 0 20px;
  min-height: 44px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(10, 46, 132, 0.16);
}
.ds-button-primary:hover {
  background: #08276F;
}
.ds-button-primary:focus-visible {
  outline: 2px solid #5A84FF;
  outline-offset: 2px;
}
```

Usage:

- “体验 Demo”
- “开始连接”
- “创建工作流”
- “查看报告”
- “立即报名”

#### Secondary orange button

Use for emphasis or conversion secondary action.

```css
.ds-button-accent {
  background: #FF6A00;
  color: #FFFFFF;
  border-radius: 12px;
  padding: 0 20px;
  min-height: 44px;
  font-weight: 600;
}
.ds-button-accent:hover {
  background: #E85F00;
}
```

Use carefully. Do not place multiple orange buttons in the same viewport unless one is clearly primary.

#### Tertiary button

```css
.ds-button-tertiary {
  background: #FFFFFF;
  color: #0A2E84;
  border: 1px solid #D9E2F2;
  border-radius: 12px;
  padding: 0 18px;
  min-height: 44px;
  font-weight: 600;
}
```

#### Text button

```css
.ds-button-text {
  color: #0A2E84;
  font-weight: 600;
  padding: 0;
}
.ds-button-text::after {
  content: "→";
  margin-left: 6px;
}
```

### 8.2 Button sizes

| Size | Height | Padding | Font |
|---|---:|---:|---:|
| Small | `32px` | `0 12px` | `12px` |
| Medium | `40px` | `0 16px` | `14px` |
| Large | `48px` | `0 22px` | `15px` |
| Hero | `52px` | `0 28px` | `16px` |

### 8.3 Inputs

Default input:

```css
.ds-input {
  height: 44px;
  border: 1px solid #D9E2F2;
  border-radius: 12px;
  background: #FFFFFF;
  color: #051B4A;
  padding: 0 14px;
  font-size: 14px;
}
.ds-input::placeholder {
  color: #8A96AD;
}
.ds-input:hover {
  border-color: #B8C6E0;
}
.ds-input:focus {
  border-color: #5A84FF;
  box-shadow: 0 0 0 4px rgba(90,132,255,0.14);
}
.ds-input:disabled {
  background: #EEF2F8;
  color: #A3ADC2;
}
```

Use labels above fields. Helper text should be muted gray. Error states should use red border plus readable error text.

### 8.4 Cards

Default card:

```css
.ds-card {
  background: #FFFFFF;
  border: 1px solid #D9E2F2;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(5, 27, 74, 0.06);
  padding: 24px;
}
```

Feature card:

```css
.ds-feature-card {
  background: linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%);
  border: 1px solid rgba(10,46,132,0.12);
  border-radius: 24px;
  padding: 32px;
}
```

Dark insight card:

```css
.ds-insight-card {
  background: radial-gradient(circle at 76% 24%, rgba(90,132,255,0.24), transparent 32%),
              linear-gradient(135deg, #051B4A, #0A2E84);
  color: #FFFFFF;
  border-radius: 24px;
  padding: 28px;
}
```

Use cards for:

- Metrics
- Integration modules
- API connection status
- Workflow steps
- AI insights
- Product features
- Customer value blocks

### 8.5 Tags and badges

Tag styles:

| Type | Background | Text | Usage |
|---|---:|---:|---|
| Data | `#EEF2F8` | `#0A2E84` | Data modules |
| Intelligence | `rgba(90,132,255,0.14)` | `#0A2E84` | AI/automation |
| Growth | `rgba(255,106,0,0.12)` | `#B84A00` | Growth highlights |
| Connect | `rgba(10,46,132,0.08)` | `#0A2E84` | Integrations |
| Success | `rgba(22,163,74,0.10)` | `#166534` | Completed |
| Warning | `rgba(245,158,11,0.12)` | `#92400E` | Attention |
| Error | `rgba(220,38,38,0.10)` | `#991B1B` | Failure |

Badge CSS:

```css
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
```

### 8.6 Navigation

#### Marketing nav

- Height: `72px`
- Background: white with 80–90% opacity when sticky
- Border bottom: subtle `#D9E2F2`
- Logo left
- Nav items center/right
- Primary CTA on far right
- Active nav item: DOTSTACK Blue text with tiny orange dot or underline

#### Dashboard sidebar

- Width: `248px`
- Background: white or `#F7FAFF`
- Active item background: `rgba(10,46,132,0.08)`
- Active icon/text: `#0A2E84`
- Active marker: small orange dot or 3px vertical orange line
- Group labels: muted gray uppercase or Chinese small label

#### Mobile bottom nav

- Height: `64px`
- 5 items max
- Active icon: DOTSTACK Blue
- Active indicator: small orange dot or pill
- Do not use heavy filled icons except active item

### 8.7 Tables

Use for data-dense product UI.

Table rules:

- Header background: `#F3F6FC`
- Header text: `#334B7A`, 12px, 600
- Body text: `#051B4A`, 13–14px
- Row height: `48–56px`
- Border: `#D9E2F2`
- Hover row: `#F7FAFF`
- Selected row: `rgba(90,132,255,0.10)`
- Numeric columns right-aligned
- Status badges centered or left-aligned depending on table density

### 8.8 Charts

Chart rules:

- Primary series: DOTSTACK Blue
- Secondary series: Tech Blue
- Highlight series: DOTSTACK Orange
- Neutral series: Neutral Gray or Mist Gray
- Use rounded bar ends when possible
- Use minimal gridlines
- Avoid too many colors
- Use direct labels for key metrics
- Use orange for only the most important value or inflection point

Recommended chart palette:

```txt
Series 1: #0A2E84
Series 2: #5A84FF
Series 3: #FF6A00
Series 4: #6B7280
Series 5: #EEF2F8
```

### 8.9 Alerts and messages

Success:

```txt
Icon: check circle
Background: rgba(22,163,74,0.10)
Border: rgba(22,163,74,0.24)
Text: #166534
```

Info:

```txt
Icon: info circle
Background: rgba(37,99,235,0.10)
Border: rgba(37,99,235,0.24)
Text: #1D4ED8
```

Warning:

```txt
Icon: alert triangle
Background: rgba(245,158,11,0.12)
Border: rgba(245,158,11,0.28)
Text: #92400E
```

Error:

```txt
Icon: x circle
Background: rgba(220,38,38,0.10)
Border: rgba(220,38,38,0.24)
Text: #991B1B
```

### 8.10 Empty states

Empty states should be constructive, not cold.

Structure:

1. Light blue/orange line icon or symbol-derived illustration
2. Clear title
3. Short explanation
4. Primary action
5. Optional secondary help link

Example:

```txt
还没有连接数据源
连接第一个数据源后，DOTSTACK 将自动生成增长洞察与任务建议。
[连接数据源]
```

### 8.11 Loading states

Use brand motion concept:

- Dot appears
- Ring connects
- Strokes radiate
- Module/card resolves

Loading component:

- Small central orange dot
- Blue circular arc spinner
- Optional text: “正在连接数据…”

Avoid generic gray skeleton-only screens for flagship product pages; combine skeletons with subtle brand arcs.

---

## 9. Iconography

### 9.1 Icon style

DOTSTACK icons should be:

- Linear
- Rounded
- Clean
- Technical
- Minimal
- Built on an 8pt grid
- Mostly blue with small orange accents

### 9.2 Icon specs

| Attribute | Value |
|---|---|
| Base grid | `24×24px` |
| Stroke | `2px` |
| Corner radius | approx. `12%` |
| Cap/join | round |
| Main color | `#0A2E84` |
| Accent color | `#FF6A00` |
| Minimum clear space | `2px` inside grid |
| Filled style | Avoid except for data dots or active status |

### 9.3 Core icon set

The system should include at least these icons:

| Chinese | English | Visual metaphor |
|---|---|---|
| 数据 | Data | Dot matrix / database grid |
| 连接 | Connect | Circular nodes / linked path |
| 增长 | Growth | Ascending bars |
| 智能 | Intelligence | Focus frame + dot |
| 安全 | Security | Shield + dot/check |
| 云 | Cloud | Rounded cloud outline |
| 分析 | Analytics | Pie or trend chart |
| API | API | Hexagon / code node |
| 工作流 | Workflow | Connected process nodes |
| 消息 | Message | Rounded chat bubble |
| 团队 | Team | Rounded people outline |
| 设置 | Settings | Gear with orange center |

### 9.4 Icon usage

- Use orange for the active point, selected node, or key insight.
- Keep icon labels bilingual in manual or marketing layouts.
- In product UI, use labels in the user’s interface language.
- Do not use multi-color icon sets from unrelated libraries without adapting stroke, radius, and color.

---

## 10. Supergraphics and pattern system

### 10.1 Base elements

Supergraphics are derived from the logo.

| Element | Usage |
|---|---|
| Dot | Data point, insight, trigger, focus |
| Arc | Connection, orbit, flow, continuity |
| Radiant stroke | Activation, growth, expansion |
| Rounded module | Cards, systems, product blocks |
| Dot matrix | Data array, background texture |
| Connection path | Workflow, integration, journey |
| Ripple ring | Intelligence propagation, signal |

### 10.2 Pattern types

#### Pattern 01: Arc field

Use:

- Presentation covers
- Report covers
- Hero backgrounds
- Event banners

Visual:

- Large faint circular arcs
- 3–8% opacity
- One or two orange focal dots maximum

#### Pattern 02: Ripple data wave

Use:

- Digital product background
- AI insight sections
- Dashboard empty states

Visual:

- Dotted wave lines
- Blue and orange dots
- Calm, not psychedelic

#### Pattern 03: Connection path

Use:

- Integration pages
- API workflows
- Process diagrams

Visual:

- Thin blue lines
- Rounded nodes
- Orange node for current/highlight step

#### Pattern 04: Array pattern

Use:

- Footer
- Sidebar
- Merchandise
- Document corners

Visual:

- Regular dot grid
- Mostly blue
- Occasional orange dot

### 10.3 Supergraphic opacity

| Context | Opacity |
|---|---:|
| Background watermark | `3–8%` |
| Decorative section graphic | `8–16%` |
| Hero large motif | `16–35%` |
| Dark card motif | `12–24%` |
| Merchandise print | depends on material; keep subtle unless used as main graphic |

### 10.4 Supergraphic don’ts

Never:

- Place supergraphics behind small body text with low contrast
- Use arcs so heavily that the page feels noisy
- Use orange as repeated decoration everywhere
- Distort the official logo as a pattern
- Mix unrelated geometric styles
- Use random clipart or illustrations that break the system

---

## 11. Illustration and imagery

### 11.1 Illustration style

DOTSTACK illustration should look:

- Abstract but understandable
- Data-driven
- Modular
- Blue/orange
- Light, clean, and systematic
- Slightly blueprint-like

Preferred motifs:

- Nodes and edges
- Circular data orbits
- Stack layers
- Dashboard modules
- API pipes
- System maps
- Insight pulses
- Growth metrics

### 11.2 Photography style

Use photography for:

- Offices
- Enterprise collaboration
- Event environments
- Technology teams
- Spatial signage mockups

Photography rules:

- Keep cool-neutral lighting
- Avoid overly warm lifestyle photos
- Use clean modern office scenes
- Add subtle blue overlay if needed
- Place logo only where contrast is clear
- Avoid cluttered desks, messy cables, dark noisy backgrounds

### 11.3 Product mockup style

Use:

- White/light gray surfaces
- Soft shadows
- Rounded device frames
- Clean dashboards
- Blue/orange highlights
- Subtle brand supergraphics

Avoid:

- Extreme perspective distortion
- Heavy 3D gloss
- Unrealistic neon
- Low-resolution screenshots
- Busy UI without hierarchy

---

## 12. Motion language

### 12.1 Motion principles

Motion should communicate connection and intelligence.

Core motion words:

- 点亮 / Illuminate
- 扩散 / Radiate
- 连接 / Connect
- 堆叠 / Stack
- 生长 / Grow

### 12.2 Motion timing

| Motion | Duration | Easing |
|---|---:|---|
| Micro hover | `120–180ms` | ease-out |
| Button press | `80–120ms` | ease-in-out |
| Card entrance | `240–360ms` | cubic-bezier(0.16, 1, 0.3, 1) |
| Chart reveal | `500–800ms` | ease-out |
| Hero motif animation | `900–1400ms` | ease-out |
| Loading loop | `1200–1800ms` | linear or smooth ease |

### 12.3 Motion patterns

#### Dot activation

1. Orange dot scales from 0.8 to 1.0
2. Blue ring fades in
3. Connected nodes appear
4. Insight card reveals

#### Radiating growth

1. Central point lights up
2. Strokes appear clockwise
3. Bar chart rises
4. Metric number counts up

#### Connection path

1. Node A appears
2. Line draws to Node B
3. Orange active node pulses
4. Workflow card enters

### 12.4 Motion don’ts

Never:

- Use bouncing playful animation
- Use fast flashing
- Rotate the logo continuously as decoration
- Use excessive particle effects
- Animate dense tables without purpose
- Make motion block task completion

Respect reduced motion settings.

---

## 13. Product UI patterns

### 13.1 Dashboard layout

A DOTSTACK dashboard should contain:

- Top greeting or page title
- Key metric cards
- Trend chart
- Channel or segment breakdown
- Task center
- AI insight or recommendation card
- Quick actions
- Data source status

Desktop dashboard structure:

```txt
[Sidebar] [Top Bar]
          [Metric Card] [Metric Card] [Metric Card] [AI Insight]
          [Trend Chart Large] [Channel Breakdown]
          [Task Center] [Workflow Status] [Data Sources]
```

Mobile dashboard structure:

```txt
[Top App Bar]
[Today's Overview]
[Key Metrics]
[Trend Card]
[Channel Distribution]
[Task Center]
[Bottom Navigation]
```

### 13.2 Metric card

Metric card content:

- Label
- Value
- Delta
- Time comparison
- Mini chart or icon
- Optional context

Example:

```txt
新增用户
2,560
↑ 12.5%（较昨日）
```

Styling:

- White card
- 16px radius
- 20px padding
- Large value in Inter Bold
- Positive delta green or DOTSTACK Blue
- Orange only for hero metric

### 13.3 AI insight card

Use for intelligent recommendations.

Content structure:

```txt
智能建议
根据过去 7 天的渠道转化表现，建议优先优化落地页首屏 CTA，并对高价值人群开启 A/B 测试。
[生成任务]
```

Style:

- Deep Navy or white card with blue border
- Small “AI” or “智能” badge
- Optional focus-frame icon
- Orange dot for insight trigger

### 13.4 Integration card

Use for data connectors.

States:

| State | Visual |
|---|---|
| Connected | Blue border, success badge |
| Syncing | Blue arc spinner, “同步中” |
| Attention needed | Orange badge, warning icon |
| Disconnected | Neutral border, muted icon |
| Error | Red badge, clear action |

### 13.5 Workflow stepper

Use a connected-dot structure.

- Completed: blue node with check
- Current: orange node with blue ring
- Upcoming: light gray node
- Connector: blue line
- Error: red node with warning icon

### 13.6 Command or search panel

For advanced product features:

- Use centered modal, max width `640px`
- Search input height `48px`
- Results grouped by type
- Icons linear blue
- Active row light blue
- Keyboard hints in mono font

---

## 14. Marketing page patterns

### 14.1 Hero section

Recommended desktop hero:

```txt
Left:
  Eyebrow badge: 企业智能连接与增长平台
  H1: 让数据连接业务，让增长自然发生
  Body: Dotstack 点绽连接数据、系统、内容与用户，以智能驱动增长，为企业提供可持续的数字化解决方案。
  CTAs: [体验 Demo] [了解更多]

Right:
  Large abstract logo-derived supergraphic
  Dashboard preview or connection diagram
```

Hero styling:

- Background: white or `#F7FAFF`
- Large faint circular arcs
- One orange focal dot
- Dark navy headline
- Orange highlight for one or two keywords only
- CTA row with primary blue button and secondary outline button

### 14.2 Feature sections

Use a 3 or 4-card grid:

1. 数据整合
2. 系统连接
3. 智能分析
4. 增长自动化

Each card:

- Icon
- Title
- 1–2 sentence explanation
- Optional metric
- Subtle arc graphic

### 14.3 Process section

Use the brand flow:

```txt
数据 Data → 连接 Connect → 增长 Growth → 智能 Intelligence → 驱动增长 Empower Growth
```

Design:

- Circular icon modules
- Arrows or connection lines
- Final step stronger blue circle with orange center

### 14.4 Trust section

Use:

- Customer logos
- Security certifications
- Uptime metrics
- Data privacy statement
- Enterprise deployment options

Style:

- White background
- Neutral gray logos
- Blue active hover
- Avoid too many colors

### 14.5 CTA section

Structure:

```txt
准备让数据真正驱动增长？
连接你的第一个数据源，开启智能增长工作流。
[预约演示] [查看解决方案]
```

Style options:

- Deep navy card
- Orange dot focus
- Subtle ripple pattern
- White text

---

## 15. Digital and social media

### 15.1 Website visual rules

The website should look:

- White and spacious
- Data/connection themed
- Enterprise SaaS grade
- Blue navigation and CTA
- Orange keyword highlights
- Light supergraphic motifs
- Clean UI screenshots

Avoid:

- Full-screen dark crypto look
- Colorful startup chaos
- Illustration-heavy consumer tone
- Dense text without modules

### 15.2 Mobile app style

Mobile UI should use:

- White surfaces
- Dark navy top accents where useful
- Rounded cards
- 4–5 bottom nav items
- Metric cards
- Simple chart cards
- Blue active state
- Orange only for alert/focus/growth highlight

### 15.3 Social avatar

Use symbol-only logo.

Rules:

- Full-color symbol on white for default avatar
- White symbol on Deep Navy for dark platform contexts
- Keep centered
- Do not include small wordmark in tiny avatar

### 15.4 Social banners

Recommended banner elements:

- Left: logo and headline
- Right: large symbol-derived supergraphic
- Background: white/mist with blue wave or arc
- Highlight one keyword in orange
- Include short tagline only

Example headline:

```txt
让数据连接业务
让增长自然发生
```

### 15.5 Event KV

Event key visual should include:

- Logo top-left
- Big title
- Date/time
- CTA
- Large dot/radiation motif
- Deep navy bottom or side curve
- Optional product module cards

Example:

```txt
智能驱动增长
连接无限可能

产品发布会 / 2026.06.18 14:00
[立即报名]
```

---

## 16. Office and document applications

### 16.1 Business card

Size:

- `90×54mm`

Front:

- Logo top-left
- Name and title left-aligned
- Contact icons small and consistent
- Large faint supergraphic on right
- Deep navy bottom strip or corner accent

Back:

- Deep Navy background
- Reversed logo
- Tagline:
  - `BUILDING CONNECTIONS, EMPOWERING GROWTH.`
- Optional dot matrix in bottom-right

### 16.2 Letterhead

Size:

- A4 `210×297mm`

Rules:

- Logo top-left
- Tagline or company info top-right
- Large faint supergraphic watermark
- Footer contact row
- Thin orange line accent near bottom
- Keep body area clean and readable

### 16.3 Envelope

Size:

- `220×110mm`

Front:

- Logo top-left
- Address/contact info lower-left
- Pale symbol watermark right side
- Stamp area dotted guide if needed

Back:

- Deep navy curved flap
- Small orange dot seal
- Website centered

### 16.4 Folder

Size:

- `220×310mm`

Front:

- Logo top-left
- Tagline below
- Large pale symbol motif
- Blue/orange curved bottom wave

Inside:

- Deep navy pocket or right panel
- White pocket shape
- Small logo and dot matrix

### 16.5 ID badge

Size:

- `85×54mm`

Front:

- Logo top
- Photo/silhouette area
- Name, pinyin/English, position
- ID number
- Blue/orange accent strip

Back:

- Logo
- QR code
- Company tagline
- Emergency/contact text if required

### 16.6 PPT template

Format:

- `16:9`

Cover:

- Logo top-left
- Big title left
- Subtitle
- Presenter/date
- Large symbol motif right
- Blue/orange curved bottom wave

Inner page:

- Page title top-left
- Small logo top-right
- Content modules
- Hex/icon cards or data cards
- Bottom page number

### 16.7 Report / Word cover

A4 cover:

- Logo top-left
- Report title
- Subtitle
- Department/author/date
- Large faint symbol motif
- Curved blue/orange accent

Back cover:

- Deep Navy
- Reversed logo
- Tagline
- Dot matrix

### 16.8 Email signature

Recommended width:

- `600–700px`

Structure:

```txt
[Logo]
张绽 / Zhang Zhan
产品总监 / Product Director

[phone icon] 138 0000 0000
[email icon] zhangzhan@dotstack.com
[web icon] www.dotstack.com
[location icon] 深圳市南山区科技园南区粤兴一道 18 号

BUILDING CONNECTIONS, EMPOWERING GROWTH.
```

Rules:

- Keep logo small and clear
- Use blue text
- Use orange only as separator or dot
- Include right-side faint symbol motif if space allows
- Avoid large images that may break in email clients

---

## 17. Environmental and merchandise applications

### 17.1 Environmental design principles

- Avoid over-decoration.
- Prioritize white space.
- Use orange for focal points.
- Use blue to build recognition and trust.
- Keep signage legible from distance.
- Use logo clear space strictly.
- Use matte or satin finishes for premium technology feel.

### 17.2 Reception wall

Use:

- Full-color horizontal logo
- White or light gray textured wall
- Soft indirect lighting
- Minimal plant or object styling
- Optional dot matrix at desk corner

Avoid:

- Busy wall patterns
- Glossy colored wall behind full-color logo
- Oversized orange surfaces

### 17.3 Office signage

Use:

- Deep Navy sign panels
- White text
- Small symbol mark
- Bilingual labels:
  - 会议室 / Meeting Room
  - 茶水间 / Pantry
  - 接待区 / Reception
- Rounded corners

### 17.4 Glass stickers

Use:

- Frosted symbol motif
- 10–20% opacity
- Large enough to be visible
- Avoid interfering with safety markings

### 17.5 Event backdrop

Use:

- White main field
- Large symbol motif right
- Blue wave bottom
- Headline:
  - `连接数据 · 释放增长`
  - `CONNECTING DATA / EMPOWERING GROWTH`
- Logo top-left
- Partner logos in grayscale or blue if needed

### 17.6 Exhibition booth

Use:

- Clean white booth
- Deep navy base or side panel
- Roll-up banner with logo, headline, icon flow
- Product screen mockup
- Orange only for CTA or focus

### 17.7 Merchandise

| Item | Preferred treatment |
|---|---|
| Tote bag | White bag, blue handle, small logo, large lower-corner symbol motif |
| Notebook | Deep Navy cover, subtle embossed supergraphic, small white logo |
| Mug | White mug, blue interior, logo front, subtle dotted motif |
| T-shirt | White shirt, small chest logo, large back symbol motif |
| Lanyard | Deep blue strap, repeating white logo, orange dot accent |
| Pen | White or navy pen, small logo, restrained orange detail |

---

## 18. Responsive behavior

### 18.1 Breakpoints

| Token | Width |
|---|---:|
| `xs` | `360px` |
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |
| `2xl` | `1536px` |

### 18.2 Desktop

- Use 12-column grids
- Side-by-side hero layouts
- Visible navigation
- Larger supergraphics
- Wider dashboard cards
- Hover states enabled

### 18.3 Tablet

- Use 8-column grids
- Reduce hero graphic size
- Stack some card groups
- Keep charts readable
- Increase touch target size

### 18.4 Mobile

- Use 4-column grid
- Single-column content
- Collapse nav to drawer or bottom nav
- Hide decorative arcs behind dense content
- Keep CTA visible
- Use horizontal scroll only for data tables when unavoidable
- Minimum tap target: `44×44px`

### 18.5 Mobile typography adjustments

| Level | Desktop | Mobile |
|---|---:|---:|
| Display | `56px` | `36px` |
| H1 | `40px` | `30px` |
| H2 | `28px` | `24px` |
| H3 | `20px` | `18px` |
| Body | `14–16px` | `14–16px` |

---

## 19. Accessibility

### 19.1 General rules

- Maintain sufficient contrast for all text and controls.
- Use visible focus states.
- Do not communicate status with color alone.
- Provide readable labels for icons.
- Support keyboard navigation.
- Respect reduced motion preferences.
- Use semantic HTML before custom components.

### 19.2 Focus style

```css
:focus-visible {
  outline: 2px solid #5A84FF;
  outline-offset: 2px;
}
```

### 19.3 Touch targets

- Minimum target: `44×44px`
- Preferred button height: `44–48px`
- Icon-only button must have accessible label

### 19.4 Chart accessibility

- Provide text summary for charts.
- Use patterns or direct labels if chart contains multiple colors.
- Avoid relying solely on orange vs blue distinctions for critical meaning.
- Include table data when charts represent important metrics.

---

## 20. Content and voice

### 20.1 Voice attributes

DOTSTACK copy should be:

- Clear
- Professional
- Confident
- Helpful
- Data-oriented
- Outcome-driven
- Not exaggerated

### 20.2 Writing style

Use:

- Short sentences
- Concrete outcomes
- Action verbs
- Measurable value
- Enterprise language without jargon overload

Avoid:

- Empty buzzwords
- Overpromising
- Cute slang
- Aggressive sales tone
- Dense technical language without explanation

### 20.3 Preferred terms

| Preferred | Avoid |
|---|---|
| 智能增长 | 爆炸式增长 |
| 数据连接 | 数据打通神器 |
| 企业级 | 黑科技 |
| 持续增长 | 一夜暴涨 |
| 可视化洞察 | 酷炫图表 |
| 自动化工作流 | 魔法流程 |
| 可信赖 | 绝对安全 |

### 20.4 CTA language

Preferred CTAs:

- 体验 Demo
- 预约演示
- 开始连接数据
- 查看解决方案
- 创建工作流
- 生成增长洞察
- 了解更多
- 下载报告

Avoid CTAs:

- 立即暴涨
- 一键躺赚
- 马上起飞
- 炸裂体验

---

## 21. Implementation tokens

### 21.1 CSS variables

```css
:root {
  /* Brand */
  --ds-blue: #0A2E84;
  --ds-orange: #FF6A00;
  --ds-tech-blue: #5A84FF;
  --ds-deep-navy: #051B4A;
  --ds-mist-gray: #EEF2F8;
  --ds-neutral-gray: #6B7280;

  /* Surfaces */
  --ds-white: #FFFFFF;
  --ds-bg: #F7FAFF;
  --ds-surface: #FFFFFF;
  --ds-surface-soft: #F3F6FC;

  /* Text */
  --ds-text-primary: #051B4A;
  --ds-text-secondary: #334B7A;
  --ds-text-muted: #6B7280;
  --ds-text-inverse: #FFFFFF;

  /* Borders */
  --ds-border: #D9E2F2;
  --ds-border-strong: #B8C6E0;

  /* Semantic */
  --ds-success: #16A34A;
  --ds-info: #2563EB;
  --ds-warning: #F59E0B;
  --ds-danger: #DC2626;
  --ds-ai: #5A84FF;

  /* Radius */
  --ds-radius-xs: 4px;
  --ds-radius-sm: 8px;
  --ds-radius-md: 12px;
  --ds-radius-lg: 16px;
  --ds-radius-xl: 24px;
  --ds-radius-full: 999px;

  /* Shadow */
  --ds-shadow-1: 0 1px 2px rgba(5, 27, 74, 0.06);
  --ds-shadow-2: 0 8px 24px rgba(5, 27, 74, 0.08);
  --ds-shadow-3: 0 16px 48px rgba(5, 27, 74, 0.12);

  /* Typography */
  --ds-font-cn: "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --ds-font-en: "Inter", Arial, Helvetica, sans-serif;
  --ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;

  /* Layout */
  --ds-container: 1200px;
  --ds-dashboard-container: 1440px;
}
```

### 21.2 Tailwind mapping

Recommended Tailwind theme aliases:

```js
export const dotstackTheme = {
  colors: {
    ds: {
      blue: "#0A2E84",
      orange: "#FF6A00",
      techBlue: "#5A84FF",
      navy: "#051B4A",
      mist: "#EEF2F8",
      neutral: "#6B7280",
      bg: "#F7FAFF",
      surface: "#FFFFFF",
      border: "#D9E2F2",
      text: {
        primary: "#051B4A",
        secondary: "#334B7A",
        muted: "#6B7280",
        inverse: "#FFFFFF",
      },
      success: "#16A34A",
      info: "#2563EB",
      warning: "#F59E0B",
      danger: "#DC2626",
    },
  },
  borderRadius: {
    dsSm: "8px",
    dsMd: "12px",
    dsLg: "16px",
    dsXl: "24px",
  },
  boxShadow: {
    ds1: "0 1px 2px rgba(5, 27, 74, 0.06)",
    ds2: "0 8px 24px rgba(5, 27, 74, 0.08)",
    ds3: "0 16px 48px rgba(5, 27, 74, 0.12)",
  },
};
```

### 21.3 Recommended React class patterns

Primary card:

```tsx
<div className="rounded-[16px] border border-[#D9E2F2] bg-white p-6 shadow-[0_1px_2px_rgba(5,27,74,0.06)]">
  ...
</div>
```

Primary button:

```tsx
<button className="h-11 rounded-[12px] bg-[#0A2E84] px-5 font-semibold text-white shadow-[0_8px_24px_rgba(10,46,132,0.16)] hover:bg-[#08276F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A84FF]">
  体验 Demo
</button>
```

Accent metric:

```tsx
<span className="font-semibold text-[#FF6A00]">+98.7%</span>
```

---

## 22. AI prompt guide

### 22.1 Prompt for landing page

```txt
Use the DOTSTACK design system from DESIGN.md.
Create a clean enterprise technology landing page for “点绽 dotstack”.
Style: white/mist background, DOTSTACK Blue dominant, orange focal accents, large logo-derived dot/arc/radiation supergraphic, generous spacing, clear bilingual headings.
Hero headline: 让数据连接业务，让增长自然发生.
Include CTA buttons, data/connect/growth/intelligence feature cards, dashboard preview, process section, and final CTA.
Do not use neon colors, unrelated gradients, or playful illustrations.
```

### 22.2 Prompt for dashboard

```txt
Use the DOTSTACK design system from DESIGN.md.
Create an enterprise analytics dashboard with metric cards, trend chart, channel breakdown, task center, AI insight card, and data source status.
Use white cards, navy text, DOTSTACK Blue active states, orange only for the key insight/focus point.
Components must use 8pt spacing, 16px cards, subtle borders, Inter/Source Han Sans typography, and accessible focus states.
```

### 22.3 Prompt for mobile app

```txt
Use DESIGN.md.
Create a mobile DOTSTACK dashboard with top greeting, today overview, key metrics, trend chart, user segment card, task center, and bottom navigation.
Use rounded white cards, subtle shadows, blue active navigation, orange focal dot, and calm data visualization.
Keep all tap targets at least 44px.
```

### 22.4 Prompt for presentation

```txt
Use DOTSTACK VI from DESIGN.md.
Create a 16:9 presentation template with cover and inner page.
Cover: logo top-left, large title, subtitle, presenter/date, large right-side logo-derived supergraphic, curved navy footer with orange accent.
Inner page: page title, two-column content, icon cards, page number, subtle grid and arcs.
```

### 22.5 Prompt for brand poster

```txt
Use DOTSTACK visual language.
Design a clean technology poster using the central orange dot, blue arcs, radiating strokes, dot matrix, and connection path graphics.
Keep background white or mist gray, use deep navy text, one orange highlight, and minimal copy.
```

---

## 23. Do’s and don’ts summary

### 23.1 Do

- Use official logo assets.
- Use DOTSTACK Blue as the main brand color.
- Use orange as the central focal energy.
- Use white space and clean grids.
- Use Source Han Sans SC and Inter.
- Use IBM Plex Mono for numbers/code.
- Use rounded cards and subtle borders.
- Use connected dots, arcs, and radiating strokes.
- Use clear bilingual hierarchy when needed.
- Keep UI calm, professional, and intelligent.
- Test contrast and small-size logo readability.

### 23.2 Don’t

- Do not stretch, recolor, rotate, or shadow the logo.
- Do not use rainbow gradients or unrelated high-saturation palettes.
- Do not overuse orange.
- Do not place logo on complex low-contrast images.
- Do not use decorative fonts.
- Do not create chaotic dashboards with too many colors.
- Do not use heavy black shadows.
- Do not make playful bouncy animations.
- Do not replace the brand symbol with random clipart.
- Do not sacrifice readability for decoration.

---

## 24. Design QA checklist

Before shipping any DOTSTACK design, confirm:

### Logo

- [ ] Official logo asset used
- [ ] Correct logo variant for background
- [ ] Clear space respected
- [ ] Minimum size respected
- [ ] No distortion or effects

### Color

- [ ] DOTSTACK Blue is dominant
- [ ] Orange is used as focus only
- [ ] Neutrals are clean and readable
- [ ] Semantic colors are restrained
- [ ] Contrast is accessible

### Typography

- [ ] Source Han Sans SC / Inter used
- [ ] Hierarchy is clear
- [ ] Body text is readable
- [ ] No unnecessary fonts
- [ ] Numbers and code use mono where appropriate

### Layout

- [ ] 8pt spacing followed
- [ ] Cards align to grid
- [ ] White space is sufficient
- [ ] Decorative graphics do not compete with content
- [ ] Mobile layout is not crowded

### Components

- [ ] Buttons follow primary/secondary/tertiary rules
- [ ] Inputs have focus, error, disabled states
- [ ] Cards use correct radius and border
- [ ] Charts use brand palette
- [ ] Alerts include icon and text, not color alone

### Brand expression

- [ ] Design feels rational, agile, open, trustworthy, and forward-looking
- [ ] Visuals reinforce data, connection, growth, and intelligence
- [ ] Tone is professional and clear
- [ ] No generic SaaS styling that loses DOTSTACK recognition

---

## 25. Suggested production roadmap

To make this DESIGN.md actionable in a real product repository:

1. Create official SVG logo assets.
2. Add CSS variables from this file to the global stylesheet.
3. Configure Tailwind theme aliases.
4. Build base components:
   - Button
   - Input
   - Card
   - Badge
   - Alert
   - MetricCard
   - InsightCard
   - DataTable
   - Navigation
5. Build dashboard page template.
6. Build marketing landing page template.
7. Build presentation and report templates.
8. Add `preview.html` showing:
   - Colors
   - Typography
   - Buttons
   - Cards
   - Inputs
   - Charts
   - Icons
   - Layout examples
9. Add visual regression screenshots.
10. Keep this file updated whenever brand tokens change.

---

## 26. Compact style directive for agents

When generating DOTSTACK UI, follow this one-sentence directive:

> Create a clean enterprise technology interface with dominant DOTSTACK Blue, precise white-space grids, rounded modular cards, Source Han Sans SC / Inter typography, subtle borders and shadows, orange focal dots for insight and growth, and logo-derived dot/arc/radiation graphics that express data connection and intelligent compounding growth.
