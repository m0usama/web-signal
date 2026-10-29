/* WEB//SIGNAL service worker: shows push notifications and opens the app. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "WEB//SIGNAL", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "WEB//SIGNAL";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || "web-signal",
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
      vibrate: [40, 60, 40],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
