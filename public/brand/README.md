# DOTSTACK 点绽 Web Logo Assets

本包为网页使用准备，包含 SVG、透明 PNG、favicon、Apple Touch Icon、PWA 图标、Open Graph 分享图与示例代码。

## 目录

- `svg/`：优先用于网页的矢量 logo
- `png/`：透明 PNG 备份与多尺寸导出
- `favicons/`：浏览器标签页、收藏夹、桌面/移动端图标
- `og-logo-1200x630.png`：社交分享 / Open Graph 图片
- `site.webmanifest`：PWA 图标配置示例
- `docs/logo-usage-example.html`：HTML 接入示例
- `preview.png`：资产预览图

## 推荐使用场景

| 场景 | 文件 |
|---|---|
| 浅色导航栏 / Header | `svg/logo-horizontal-color.svg` |
| 深色导航栏 / 深色 Hero | `svg/logo-horizontal-white.svg` |
| 单色低成本印刷或极简界面 | `svg/logo-horizontal-navy.svg` |
| 移动端折叠菜单 / 圆形按钮 | `svg/logo-icon-color.svg` |
| 深色底图标 | `svg/logo-icon-white.svg` |
| 仅文字品牌露出 | `svg/logo-wordmark-color.svg` |
| favicon | `favicons/favicon.ico` + `favicons/favicon.svg` |
| iOS 添加到主屏幕 | `favicons/apple-touch-icon.png` |
| PWA Android 图标 | `favicons/android-chrome-192x192.png`, `favicons/android-chrome-512x512.png` |
| 社交分享图 | `og-logo-1200x630.png` |

## HTML 接入示例

```html
<link rel="icon" href="/favicons/favicon.ico" sizes="any" />
<link rel="icon" href="/favicons/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

<a href="/" aria-label="DOTSTACK 首页">
  <img src="/svg/logo-horizontal-color.svg" alt="DOTSTACK 点绽" width="180" height="auto" />
</a>
```

## CSS 建议

```css
.brand-logo {
  display: block;
  width: 180px;
  height: auto;
}

@media (max-width: 768px) {
  .brand-logo { width: 148px; }
  .brand-logo--icon { width: 40px; height: 40px; }
}
```

## 使用规则

- 浅色背景优先使用全彩横版；深色背景使用白色反白版。
- Header 中横版 logo 推荐高度 32–44px；移动端 icon 推荐 32–40px。
- logo 周围至少保留一个橙色圆点直径的安全距离。
- 不要拉伸、旋转、随意改色、加阴影、描边或拆分图形与字标。
- favicon 与 app icon 已采用安全内边距，避免在圆角或遮罩场景中被裁切。

## Brand Tokens

```css
:root {
  --dotstack-blue: #0A2E84;
  --dotstack-orange: #FF6A00;
  --deep-navy: #051B4A;
  --mist-gray: #EEF2F8;
  --neutral-gray: #6B7280;
}
```
