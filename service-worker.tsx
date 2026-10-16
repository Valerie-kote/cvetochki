"use client";

import * as React from "react";

// Регистрируем service worker только в production и только на клиенте,
// чтобы не мешать dev-режиму с HMR.
export function ServiceWorker() {
  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // тихо игнорируем — SW не критичен
      });
    }
  }, []);
  return null;
}
