import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOTSTACK 点绽交付台",
  description: "DOTSTACK 点绽团队任务分发、交付协同与数据洞察面板",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "点绽交付台"
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
          src="https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.26.js"
          data-feishu-jssdk="true"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
