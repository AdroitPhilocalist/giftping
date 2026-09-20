"use client";

import Script from "next/script";
import { useEffect } from "react";
import { whenOneSignalReady } from "@/lib/push/client";

/**
 * Loads the OneSignal SDK for SIGNED-IN users only (anonymous visitors never download a third-party script) and links the browser to the
 * user's id so the server can address pushes to them. It never prompts for permission — that's an explicit button in notification settings.
 */
let initialised = false;

export function OneSignalIdentity({ appId, userId }: { appId: string; userId: string }) {
  useEffect(() => {
    (window.OneSignalDeferred ??= []).push(async (sdk) => {
      if (!initialised) {
        initialised = true;
        await sdk.init({
          appId,
          serviceWorkerPath: "OneSignalSDKWorker.js",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
      }
      await sdk.login(userId);
    });
  }, [appId, userId]);

  return <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" defer />;
}

// Re-exported so pages can await the SDK without importing the client module directly.
export { whenOneSignalReady };
