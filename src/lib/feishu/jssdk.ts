/**
 * 飞书 JSSDK tt.* 客户端能力封装
 *
 * 仅在飞书容器内运行（PC客户端 / 移动端 webview）
 * 浏览器中调用会静默降级，不抛异常
 *
 * 官方文档: https://open.feishu.cn/document/client-docs/web-app-sdk/web-app-guide/introduction
 */

// ===== Type declarations =====
interface TtSDK {
  // Auth
  requestAuthCode(opts: {
    appId: string;
    success: (res: { code: string }) => void;
    fail: (err: unknown) => void;
  }): void;

  // Navigation
  setNavigationBarTitle(opts: { title: string }): void;
  setNavigationBarColor(opts: {
    frontColor: "#ffffff" | "#000000";
    backgroundColor: string;
  }): void;
  navigateBack(opts?: { delta?: number }): void;
  closeWindow(): void;

  // Native UI
  showToast(opts: {
    title: string;
    type?: "success" | "fail" | "none";
    duration?: number;
    success?: () => void;
  }): void;
  hideToast(): void;
  showModal(opts: {
    title: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    success?: (res: { confirm: boolean; cancel: boolean }) => void;
  }): void;
  showActionSheet(opts: {
    title?: string;
    itemList: string[];
    success?: (res: { tapIndex: number }) => void;
    fail?: () => void;
  }): void;
  showLoading(opts?: { title?: string }): void;
  hideLoading(): void;

  // Share
  shareContent(opts: {
    title: string;
    content?: string;
    url?: string;
    imageUrl?: string;
    success?: () => void;
    fail?: (err: unknown) => void;
  }): void;

  // Contact / User picker
  biz: {
    contact: {
      choose(opts: {
        multi: boolean;
        selectedOpenIds?: string[];
        success: (res: { data: Array<{ openId: string; name: string; avatarUrl?: string }> }) => void;
        fail?: (err: unknown) => void;
      }): void;
    };
    chat: {
      open(opts: { openChatId: string }): void;
    };
    calendar: {
      chooseTime(opts: {
        startTime?: number;
        success: (res: { startTime: number; endTime: number }) => void;
        fail?: (err: unknown) => void;
      }): void;
    };
  };

  // Image / file
  chooseImage(opts: {
    count?: number;
    sourceType?: Array<"album" | "camera">;
    success: (res: { tempFilePaths: string[]; tempFiles: Array<{ path: string; size: number }> }) => void;
    fail?: (err: unknown) => void;
  }): void;
  previewImage(opts: { current: string; urls: string[] }): void;

  // Scan
  scanCode(opts: {
    success: (res: { result: string; scanType: string }) => void;
    fail?: (err: unknown) => void;
  }): void;

  // Clipboard
  setClipboardData(opts: { data: string; success?: () => void }): void;
  getClipboardData(opts: { success: (res: { data: string }) => void }): void;

  // Device
  getSystemInfo(opts: {
    success: (res: {
      platform: "ios" | "android" | "pc";
      statusBarHeight: number;
      safeArea: { top: number; bottom: number; left: number; right: number };
    }) => void;
  }): void;
}

declare global {
  interface Window {
    tt?: TtSDK;
    h5sdk?: {
      ready(callback: () => void): void;
      error?(callback: (error: unknown) => void): void;
    };
  }
}

const FEISHU_JSSDK_URL = "https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.26.js";
let sdkLoadPromise: Promise<void> | null = null;

function tt(): TtSDK | null {
  if (typeof window === "undefined") return null;
  return window.tt ?? null;
}

export function isInFeishu(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("lark") || ua.includes("feishu");
}

export function ensureFeishuJssdk(timeoutMs = 6000): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is unavailable."));
  if (window.tt?.requestAuthCode && window.h5sdk?.ready) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-feishu-jssdk="true"]');
    const script = existing ?? document.createElement("script");
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      sdkLoadPromise = null;
      reject(new Error("Feishu JSSDK failed to load."));
    };

    const timer = window.setTimeout(() => {
      if (window.tt?.requestAuthCode && window.h5sdk?.ready) finish();
      else fail();
    }, timeoutMs);

    const onLoaded = () => {
      window.clearTimeout(timer);
      if (window.tt?.requestAuthCode && window.h5sdk?.ready) finish();
      else fail();
    };

    script.addEventListener("load", onLoaded, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      fail();
    }, { once: true });

    if (!existing) {
      script.src = FEISHU_JSSDK_URL;
      script.async = true;
      script.dataset.feishuJssdk = "true";
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

export function requestFeishuAuthCode(appId: string): Promise<string> {
  return ensureFeishuJssdk().then(() => new Promise((resolve, reject) => {
    const sdk = window.h5sdk;
    const ttSdk = window.tt;
    if (!sdk || !ttSdk?.requestAuthCode) {
      reject(new Error("Feishu JSSDK is unavailable."));
      return;
    }

    sdk.error?.((error) => reject(error));
    sdk.ready(() => {
      ttSdk.requestAuthCode({
        appId,
        success: (res) => resolve(res.code),
        fail: (error) => reject(error)
      });
    });
  }));
}

// ===== Navigation Bar =====

/** Set the navigation bar title in Feishu (e.g. "看板 (3待复核)") */
export function setNavTitle(title: string): void {
  tt()?.setNavigationBarTitle({ title });
}

/** Set navigation bar to match Feishu blue */
export function setNavFeishuBlue(): void {
  tt()?.setNavigationBarColor({ frontColor: "#ffffff", backgroundColor: "#3370FF" });
}

// ===== Native UI =====

/**
 * Show a native Feishu toast.
 * Falls back to our custom toast callback when not in Feishu.
 */
export function showNativeToast(
  title: string,
  type: "success" | "fail" | "none" = "success",
  fallback?: (msg: string) => void
): void {
  if (tt()) {
    tt()?.showToast({ title, type, duration: 2000 });
  } else {
    fallback?.(title);
  }
}

/**
 * Show a native Feishu confirmation modal.
 * Returns a Promise<boolean>.
 * Falls back to browser confirm() outside Feishu.
 */
export function showConfirmModal(
  title: string,
  content?: string,
  confirmText = "确认",
  cancelText = "取消"
): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = tt();
    if (sdk) {
      sdk.showModal({
        title,
        content,
        confirmText,
        cancelText,
        success: (res) => resolve(res.confirm)
      });
    } else {
      resolve(window.confirm(content ? `${title}\n${content}` : title));
    }
  });
}

export function showNativeLoading(title = "加载中..."): void {
  tt()?.showLoading({ title });
}

export function hideNativeLoading(): void {
  tt()?.hideLoading();
}

// ===== Share =====

/**
 * Share a task link to Feishu chats via native share sheet.
 */
export function shareTask(task: { title: string; id: string }, webAppUrl: string): void {
  const url = `${webAppUrl}?focus=${encodeURIComponent(task.id)}`;
  if (tt()) {
    tt()?.shareContent({
      title: `看板任务：${task.title}`,
      content: "点击查看任务详情和操作",
      url
    });
  } else {
    // Desktop fallback: copy link
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }
}

// ===== Contact Picker =====

/**
 * Open the native Feishu contact picker.
 * Returns selected user(s) with openId and name.
 * Falls back to null outside Feishu.
 */
export function pickContact(multi = false): Promise<Array<{ openId: string; name: string }> | null> {
  return new Promise((resolve) => {
    const sdk = tt();
    if (!sdk?.biz?.contact) {
      resolve(null);
      return;
    }
    sdk.biz.contact.choose({
      multi,
      success: (res) => resolve(res.data),
      fail: () => resolve(null)
    });
  });
}

// ===== Calendar Time Picker =====

/**
 * Open the native Feishu calendar time picker.
 * Returns { startTime, endTime } as Unix timestamps (seconds).
 */
export function pickMeetingTime(defaultStart?: Date): Promise<{ startTime: number; endTime: number } | null> {
  return new Promise((resolve) => {
    const sdk = tt();
    if (!sdk?.biz?.calendar) {
      resolve(null);
      return;
    }
    sdk.biz.calendar.chooseTime({
      startTime: defaultStart ? Math.floor(defaultStart.getTime() / 1000) : undefined,
      success: (res) => resolve(res),
      fail: () => resolve(null)
    });
  });
}

// ===== Image Picker =====

/**
 * Open the native Feishu image/file picker.
 * Returns an array of local file paths.
 */
export function pickImages(count = 1): Promise<Array<{ path: string; size: number }> | null> {
  return new Promise((resolve) => {
    const sdk = tt();
    if (!sdk) {
      resolve(null);
      return;
    }
    sdk.chooseImage({
      count,
      sourceType: ["album", "camera"],
      success: (res) => resolve(res.tempFiles),
      fail: () => resolve(null)
    });
  });
}

// ===== System Info =====

export function getSystemInfo(): Promise<{ platform: "ios" | "android" | "pc"; safeArea: { bottom: number; top: number } } | null> {
  return new Promise((resolve) => {
    const sdk = tt();
    if (!sdk) { resolve(null); return; }
    sdk.getSystemInfo({
      success: (res) => resolve({ platform: res.platform, safeArea: { bottom: res.safeArea.bottom, top: res.safeArea.top } })
    });
  });
}

// ===== Chat Deep Link =====

/** Open a Feishu chat directly from within the webview */
export function openFeishuChat(chatId: string): void {
  if (tt()?.biz?.chat) {
    tt()?.biz.chat.open({ openChatId: chatId });
  } else {
    window.open(`https://applink.feishu.cn/client/chat?chat_id=${chatId}`, "_blank");
  }
}

// ===== Clipboard =====

export function copyToClipboard(text: string): void {
  if (tt()) {
    tt()?.setClipboardData({ data: text });
  } else {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  }
}
