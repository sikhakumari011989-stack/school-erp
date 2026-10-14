/**
 * Service Worker Registration Utility
 */

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.info("[PWA] Service Worker registered successfully with scope:", registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.info("[PWA] New content is available; please refresh.");
                } else {
                  console.info("[PWA] Content is cached for offline use.");
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    });
  }
}

