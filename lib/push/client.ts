"use client";

/**
 * Thin, defensive wrappers over the OneSignal web SDK (v16). Every call goes through `OneSignalDeferred`, which the SDK drains once it
 * has loaded — so these are safe to call before, after, or without the SDK ever loading (ad-blockers block it; nothing may break).
 */
type OneSignalSdk = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: { permission: boolean; requestPermission: () => Promise<void>; isPushSupported: () => boolean };
  User: { PushSubscription: { optedIn: boolean | undefined; optIn: () => Promise<void>; optOut: () => Promise<void> } };
};
declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void | Promise<void>>;
  }
}

export function whenOneSignalReady<T>(fn: (sdk: OneSignalSdk) => Promise<T> | T, timeoutMs = 4000): Promise<T | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    (window.OneSignalDeferred ??= []).push(async (sdk) => {
      try {
        resolve(await fn(sdk));
      } catch {
        resolve(null);
      } finally {
        clearTimeout(timer);
      }
    });
  });
}

/** Unlinks this browser from the signed-in user. Call BEFORE signing out so a shared computer never keeps receiving the last user's pushes. */
export async function pushLogout(): Promise<void> {
  await whenOneSignalReady((sdk) => sdk.logout(), 1500);
}

export type PushStatus = "loading" | "unsupported" | "blocked" | "off" | "on";

export async function readPushStatus(): Promise<PushStatus> {
  const status = await whenOneSignalReady<PushStatus>((sdk) => {
    if (!sdk.Notifications.isPushSupported()) return "unsupported";
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return "blocked";
    return sdk.User.PushSubscription.optedIn ? "on" : "off";
  });
  return status ?? "unsupported";
}

export async function enablePush(): Promise<PushStatus> {
  await whenOneSignalReady(async (sdk) => {
    await sdk.Notifications.requestPermission();
    await sdk.User.PushSubscription.optIn();
  }, 60_000); // the person may take a while to answer the browser prompt
  return readPushStatus();
}

export async function disablePush(): Promise<PushStatus> {
  await whenOneSignalReady((sdk) => sdk.User.PushSubscription.optOut());
  return readPushStatus();
}
