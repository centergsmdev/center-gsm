export const LIVE_CHAT_ABUSE_TOKEN_KEY = "center-gsm-live-chat-abuse-token";
export const LIVE_CHAT_VISITOR_COOKIE_KEY = "center-gsm-live-chat-visitor";
export const LIVE_CHAT_DEVICE_PROFILE_HEADER = "x-live-chat-device-profile";
export const LIVE_CHAT_BLOCKED_MESSAGE =
  "Canlı destek erişiminiz şu anda kullanılamıyor.";

export type CoarseDeviceProfile = {
  browserFamily: string;
  osFamily: string;
  viewportClass: "small" | "medium" | "large";
  timezone: string;
  language: string;
};

export function createCoarseDeviceProfile(): CoarseDeviceProfile {
  const userAgent = navigator.userAgent;
  const browserFamily = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Other";
  const osFamily = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Other";
  const width = window.innerWidth;
  return {
    browserFamily,
    osFamily,
    viewportClass: width < 640 ? "small" : width < 1024 ? "medium" : "large",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    language: navigator.language?.slice(0, 12) || "unknown",
  };
}

export function encodeCoarseDeviceProfile(profile: CoarseDeviceProfile) {
  return encodeURIComponent(JSON.stringify(profile));
}
