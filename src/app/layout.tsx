import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "点栈 KANBAN",
  description: "点栈团队任务分发、交付协同与数据洞察面板",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "点栈 KANBAN"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const feishuAppId = process.env.NEXT_PUBLIC_FEISHU_APP_ID || "";

  return (
    <html lang="zh-CN">
      <head>{feishuAppId ? <meta name="feishu-app-id" content={feishuAppId} /> : null}</head>
      <body>{children}</body>
    </html>
  );
}
