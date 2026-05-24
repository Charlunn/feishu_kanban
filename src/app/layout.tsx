import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI交付战情看板",
  description: "飞书内嵌的三人团队任务认领和复核看板",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "战情看板"
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
      <head>
        {feishuAppId && <meta name="feishu-app-id" content={feishuAppId} />}
        {/*
          Feishu JSSDK — provides tt.* APIs inside Feishu webview:
          - tt.requestAuthCode (login)
          - tt.setNavigationBarTitle / setNavigationBarColor
          - tt.showToast / showModal / showActionSheet
          - tt.biz.contact.choose (contact picker)
          - tt.biz.calendar.chooseTime (time picker)
          - tt.shareContent (native share)
          - tt.chooseImage (image/file picker)
        */}
        <script
          src="https://lf-cdn.feishu.cn/obj/feishu-static/lark/tt-jsapi/tt_jsapi.2.18.0.js"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
